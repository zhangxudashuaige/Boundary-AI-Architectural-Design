process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const { app } = require('../src/app');

test('GET /health returns service status and timestamp', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  );

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'ai-arch-render-backend');
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
});
