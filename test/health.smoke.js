process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'silent';

const assert = require('node:assert/strict');
const { once } = require('node:events');

const { app } = require('../src/app');

const run = async () => {
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');

    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'ai-arch-render-backend');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));

    console.log('PASS test/health.smoke.js');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

run().catch((error) => {
  console.error('FAIL test/health.smoke.js');
  console.error(error);
  process.exitCode = 1;
});
