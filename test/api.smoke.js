process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
process.env.MOCK_RENDER_DELAY_MS = '100';
process.env.AI_PROVIDER = 'MOCK';

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

const testHealth = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'ai-arch-render-backend');
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
};

const testUpload = async (baseUrl) => {
  const formData = new FormData();
  formData.append(
    'image',
    new Blob([tinyPngBuffer], { type: 'image/png' }),
    'sample.png'
  );

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: formData
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(body.fileName, /sample\.png$/);
  assert.match(body.filePath, /^uploads\/.+/);
  assert.equal(body.url, `${baseUrl}/${body.filePath}`);

  const savedFilePath = path.join(process.cwd(), body.filePath);
  const savedFile = await fs.readFile(savedFilePath);
  assert.equal(savedFile.length > 0, true);

  const staticResponse = await fetch(body.url);
  assert.equal(staticResponse.status, 200);

  return body;
};

const testRenderFlow = async (baseUrl, imageUrl) => {
  const createResponse = await fetch(`${baseUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      prompt: 'modern concrete villa with warm sunset lighting'
    })
  });
  const createBody = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createBody.success, true);
  assert.equal(createBody.data.task.imageUrl, imageUrl);
  assert.equal(createBody.data.task.inputFileUrl, imageUrl);
  assert.equal(createBody.data.task.inputFileType, 'image');
  assert.equal(
    createBody.data.task.prompt,
    'modern concrete villa with warm sunset lighting'
  );
  assert.equal(
    createBody.data.task.renderPrompt,
    'modern concrete villa with warm sunset lighting'
  );
  assert.equal(createBody.data.task.analysisStatus, 'skipped');
  assert.equal(createBody.data.task.renderStatus, 'pending');
  assert.match(createBody.data.task.status, /^(pending|processing)$/);

  const taskId = createBody.data.task.id;
  let fetchedTask = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/render/${taskId}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);

    fetchedTask = body.data.task;

    if (fetchedTask.status === 'completed') {
      break;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  assert.ok(fetchedTask);
  assert.equal(fetchedTask.id, taskId);
  assert.equal(fetchedTask.status, 'completed');
  assert.equal(fetchedTask.imageUrl, imageUrl);
  assert.equal(fetchedTask.inputFileUrl, imageUrl);
  assert.equal(fetchedTask.inputFileType, 'image');
  assert.equal(fetchedTask.analysisStatus, 'skipped');
  assert.equal(fetchedTask.renderStatus, 'completed');
  assert.match(
    fetchedTask.optimizedPrompt,
    /photorealistic architectural rendering/
  );
  assert.match(
    fetchedTask.resultImageUrl,
    /^https:\/\/mock-render\.local\/results\/render-task-\d+\.webp$/
  );

  await query('DELETE FROM render_tasks WHERE id = $1', [taskId]);
};

const run = async () => {
  const server = app.listen(0, '127.0.0.1');
  let uploadResult = null;

  try {
    await once(server, 'listening');

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    await applySchemaMigration();
    await testHealth(baseUrl);
    uploadResult = await testUpload(baseUrl);
    await testRenderFlow(baseUrl, uploadResult.url);

    console.log('PASS test/api.smoke.js');
  } finally {
    if (uploadResult) {
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
  console.error('FAIL test/api.smoke.js');
  console.error(error);
  process.exitCode = 1;
});
