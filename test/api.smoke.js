process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';
process.env.MOCK_RENDER_DELAY_MS = '100';
process.env.AI_PROVIDER = 'MOCK';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3001';

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

const testDatabaseHealth = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/health/db`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.connected, true);
  assert.equal(typeof body.database, 'string');
  assert.equal(typeof body.latencyMs, 'number');
  assert.ok(!Number.isNaN(Date.parse(body.serverTime)));
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
};

const testCors = async (baseUrl) => {
  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: {
      Origin: 'http://localhost:3001'
    }
  });

  assert.equal(
    healthResponse.headers.get('access-control-allow-origin'),
    'http://localhost:3001'
  );
  assert.match(healthResponse.headers.get('vary') || '', /Origin/i);

  const preflightResponse = await fetch(`${baseUrl}/api/upload`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3001',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });

  assert.equal(preflightResponse.status, 204);
  assert.equal(
    preflightResponse.headers.get('access-control-allow-origin'),
    'http://localhost:3001'
  );
  assert.match(
    preflightResponse.headers.get('access-control-allow-methods') || '',
    /POST/
  );
  assert.match(
    preflightResponse.headers.get('access-control-allow-headers') || '',
    /Content-Type/i
  );
};

const testPromptRefine = async (baseUrl) => {
  const rawPrompt =
    'render this building as a modern villa with glass, concrete, timber, and warm sunset light';
  const response = await fetch(`${baseUrl}/api/prompt/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rawPrompt
    })
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.message, '服务器繁忙，请稍后再试');
};

const testPromptRefineValidation = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/prompt/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rawPrompt: '   '
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, 'rawPrompt is required');
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
  assert.equal(
    createBody.data.task.optimizedPrompt,
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
  assert.equal(
    fetchedTask.optimizedPrompt,
    'modern concrete villa with warm sunset lighting'
  );
  assert.match(
    fetchedTask.resultImageUrl,
    /^https:\/\/mock-render\.local\/results\/image-edit-[0-9a-f-]+\.webp$/
  );

  return fetchedTask;
};

const testTextOnlyRenderFlow = async (baseUrl) => {
  const createResponse = await fetch(`${baseUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: 'futuristic architectural concept with glass facade and dusk lighting'
    })
  });
  const createBody = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createBody.success, true);
  assert.equal(createBody.data.task.imageUrl, null);
  assert.equal(createBody.data.task.inputFileUrl, null);
  assert.equal(createBody.data.task.inputFileType, 'text');
  assert.equal(
    createBody.data.task.prompt,
    'futuristic architectural concept with glass facade and dusk lighting'
  );
  assert.equal(
    createBody.data.task.renderPrompt,
    'futuristic architectural concept with glass facade and dusk lighting'
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
  assert.equal(fetchedTask.imageUrl, null);
  assert.equal(fetchedTask.inputFileUrl, null);
  assert.equal(fetchedTask.inputFileType, 'text');
  assert.equal(fetchedTask.analysisStatus, 'skipped');
  assert.equal(fetchedTask.renderStatus, 'completed');
  assert.match(fetchedTask.resultImageUrl, /^data:image\/png;base64,/);

  return fetchedTask;
};

const testRenderHistory = async (baseUrl, expectedTaskId) => {
  const response = await fetch(`${baseUrl}/api/render?limit=10&offset=0`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.tasks));
  assert.equal(body.data.pagination.count >= 1, true);

  const task = body.data.tasks.find((item) => item.id === expectedTaskId);

  assert.ok(task);
  assert.equal(task.id, expectedTaskId);
  assert.equal(task.status, 'completed');
};

const testRenderResultDownload = async (baseUrl, taskId) => {
  const response = await fetch(`${baseUrl}/api/render/${taskId}/download`);
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.match(
    response.headers.get('content-disposition') || '',
    new RegExp(`attachment; filename="render-result-${taskId}\\.png"`)
  );
  assert.equal(body.equals(tinyPngBuffer), true);
};

const testDeleteRenderTask = async (baseUrl, taskId) => {
  const deleteResponse = await fetch(`${baseUrl}/api/render/${taskId}`, {
    method: 'DELETE'
  });
  const deleteBody = await deleteResponse.json();

  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteBody.success, true);
  assert.equal(deleteBody.data.task.id, taskId);

  const fetchResponse = await fetch(`${baseUrl}/api/render/${taskId}`);
  const fetchBody = await fetchResponse.json();

  assert.equal(fetchResponse.status, 404);
  assert.equal(fetchBody.message, 'Render task not found');
};

const run = async () => {
  const server = app.listen(0, '127.0.0.1');
  let uploadResult = null;
  let textOnlyTask = null;

  try {
    await once(server, 'listening');

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    await applySchemaMigration();
    await testHealth(baseUrl);
    await testDatabaseHealth(baseUrl);
    await testCors(baseUrl);
    await testPromptRefine(baseUrl);
    await testPromptRefineValidation(baseUrl);
    textOnlyTask = await testTextOnlyRenderFlow(baseUrl);
    await testRenderResultDownload(baseUrl, textOnlyTask.id);
    await testDeleteRenderTask(baseUrl, textOnlyTask.id);
    textOnlyTask = null;
    uploadResult = await testUpload(baseUrl);
    const renderedTask = await testRenderFlow(baseUrl, uploadResult.url);
    await testRenderHistory(baseUrl, renderedTask.id);
    await testRenderResultDownload(baseUrl, renderedTask.id);
    await testDeleteRenderTask(baseUrl, renderedTask.id);

    console.log('PASS test/api.smoke.js');
  } finally {
    if (textOnlyTask?.id) {
      await query('DELETE FROM render_tasks WHERE id = $1', [textOnlyTask.id]).catch(() => {});
    }

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
