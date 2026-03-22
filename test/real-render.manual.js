process.env.NODE_ENV = 'production';

const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const { once } = require('node:events');

const { app } = require('../src/app');
const { env } = require('../src/config/env');
const { closeDatabasePool, query } = require('../src/config/database');

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=';
const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

const summarizeResultImageUrl = (value) => {
  if (typeof value !== 'string' || value === '') {
    return value;
  }

  if (value.startsWith('data:image/')) {
    return `[data-url length=${value.length}]`;
  }

  return value;
};

const applySchemaMigration = async () => {
  const migrationSql = await fs.readFile(
    path.join(process.cwd(), 'database', 'init.sql'),
    'utf8'
  );

  await query(migrationSql);
};

const uploadFixtureImage = async (baseUrl) => {
  const formData = new FormData();
  formData.append(
    'image',
    new Blob([tinyPngBuffer], { type: 'image/png' }),
    'real-render-test.png'
  );

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: formData
  });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.ok(payload.url);

  return payload;
};

const createRenderTask = async (baseUrl, imageUrl, prompt) => {
  const response = await fetch(`${baseUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      prompt
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.success, true);
  assert.ok(payload.data?.task?.id);

  return payload.data.task;
};

const pollRenderTask = async (baseUrl, taskId, maxAttempts = 30, intervalMs = 3000) => {
  let latestTask = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/render/${taskId}`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);

    latestTask = payload.data.task;

    if (latestTask.status === 'completed' || latestTask.status === 'failed') {
      return latestTask;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  return latestTask;
};

const run = async () => {
  if (env.ai.provider !== '302AI') {
    throw new Error(
      `AI_PROVIDER must be 302AI for this script. Current value: ${env.ai.provider}`
    );
  }

  const server = app.listen(0, '127.0.0.1');
  let uploadResult = null;
  let task = null;

  try {
    await once(server, 'listening');

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    await applySchemaMigration();
    uploadResult = await uploadFixtureImage(baseUrl);

    task = await createRenderTask(
      baseUrl,
      uploadResult.url,
      'architectural rendering of a modern villa facade with glass, concrete, and warm sunset lighting'
    );

    const finalTask = await pollRenderTask(baseUrl, task.id);

    if (!finalTask) {
      throw new Error('Render polling ended without receiving a task result');
    }

    if (finalTask.status !== 'completed') {
      throw new Error(
        `Render task did not complete successfully: ${finalTask.errorMessage || finalTask.status}`
      );
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          taskId: finalTask.id,
          status: finalTask.status,
          renderStatus: finalTask.renderStatus,
          resultImageUrl: summarizeResultImageUrl(finalTask.resultImageUrl),
          optimizedPrompt: finalTask.optimizedPrompt,
          model: env.ai.imageModel
        },
        null,
        2
      )
    );

    await query('DELETE FROM render_tasks WHERE id = $1', [finalTask.id]);
    task = null;
  } finally {
    if (task?.id) {
      await query('DELETE FROM render_tasks WHERE id = $1', [task.id]).catch(() => {});
    }

    if (uploadResult?.filePath) {
      const savedFilePath = path.join(process.cwd(), uploadResult.filePath);
      await fs.unlink(savedFilePath).catch(() => {});
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await closeDatabasePool().catch(() => {});
  }
};

run().catch((error) => {
  console.error('FAIL test/real-render.manual.js');
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
