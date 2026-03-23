process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
process.env.AI_PROVIDER = '302AI';
process.env.AI_API_KEY = 'Bearer test-key';
process.env.IMAGE_MODEL = 'wavespeed-ai/flux-schnell';

const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const { once } = require('node:events');

const { app } = require('../src/app');
const { closeDatabasePool, query } = require('../src/config/database');

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=';
const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

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
    'failure-test.png'
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

const createInspirationTask = async (baseUrl, imageUrl, prompt) => {
  const response = await fetch(`${baseUrl}/api/inspiration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      rawPrompt: prompt,
      refinedPrompt: '',
      prompt
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.success, true);
  assert.ok(payload.data?.task?.id);

  return payload.data.task;
};

const pollInspirationTask = async (
  baseUrl,
  taskId,
  maxAttempts = 20,
  intervalMs = 100
) => {
  let latestTask = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/inspiration/${taskId}`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);

    latestTask = payload.data.task;

    if (latestTask.status === 'failed') {
      return latestTask;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  return latestTask;
};

const run = async () => {
  const server = app.listen(0, '127.0.0.1');
  let uploadResult = null;
  let task = null;

  try {
    await once(server, 'listening');

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    await applySchemaMigration();
    uploadResult = await uploadFixtureImage(baseUrl);

    task = await createInspirationTask(
      baseUrl,
      uploadResult.url,
      'modern concrete villa with warm sunset lighting'
    );

    const failedTask = await pollInspirationTask(baseUrl, task.id);

    assert.ok(failedTask);
    assert.equal(failedTask.id, task.id);
    assert.equal(failedTask.status, 'failed');
    assert.equal(failedTask.generationStatus, 'failed');
    assert.equal(failedTask.resultImageUrl, null);
    assert.equal(
      failedTask.optimizedPrompt,
      'modern concrete villa with warm sunset lighting'
    );
    assert.match(
      failedTask.errorMessage,
      /does not support image editing/i
    );

    await query('DELETE FROM inspiration_tasks WHERE id = $1', [failedTask.id]);
    task = null;

    console.log('PASS test/inspiration-failure.smoke.js');
  } finally {
    if (task?.id) {
      await query('DELETE FROM inspiration_tasks WHERE id = $1', [task.id]).catch(() => {});
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
  console.error('FAIL test/inspiration-failure.smoke.js');
  console.error(error);
  process.exitCode = 1;
});
