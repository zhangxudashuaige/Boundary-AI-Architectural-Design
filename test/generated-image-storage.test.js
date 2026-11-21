const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { persistGeneratedImage } = require('../src/services/generated-image-storage.service');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=', 'base64');

const fixture = async (t) => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'generated-image-test-'));
  const originalFetch = global.fetch;
  t.after(async () => {
    global.fetch = originalFetch;
    await fs.rm(storageRoot, { recursive: true, force: true });
  });
  return { storageRoot, taskId: 12, fileNamePrefix: 'render-result' };
};

test('downloads upstream bytes and returns a local URL that remains usable offline', async (t) => {
  const options = await fixture(t);
  const remoteUrl = 'https://images.example/result.jpg?token=temporary';
  let calls = 0;
  global.fetch = async (url) => {
    assert.equal(url, remoteUrl);
    calls += 1;
    return new Response(png, { headers: { 'Content-Type': 'image/png' } });
  };
  const result = await persistGeneratedImage({ ...options, imageUrl: remoteUrl });
  assert.match(result, /^\/uploads\/generated\/render-result-12-[\w-]+\.png$/);
  global.fetch = async () => { throw new Error('upstream unavailable'); };
  assert.deepEqual(await fs.readFile(path.join(options.storageRoot, 'generated', path.posix.basename(result))), png);
  assert.equal(calls, 1);
  assert.equal((await fs.readdir(path.join(options.storageRoot, 'generated'))).length, 1);
});

test('persists base64 outputs and isolates render and inspiration filenames', async (t) => {
  const options = await fixture(t);
  global.fetch = async () => { throw new Error('must not fetch data URLs'); };
  const imageUrl = `data:image/png;base64,${png.toString('base64')}`;
  const first = await persistGeneratedImage({ ...options, imageUrl });
  const second = await persistGeneratedImage({ ...options, imageUrl, fileNamePrefix: 'inspiration-result' });
  assert.notEqual(first, second);
  assert.match(second, /inspiration-result-12-/);
  assert.equal((await fs.readdir(path.join(options.storageRoot, 'generated'))).length, 2);
});

test('rejects an upstream error without publishing a result', async (t) => {
  const options = await fixture(t);
  global.fetch = async () => new Response('expired', { status: 403 });
  await assert.rejects(persistGeneratedImage({ ...options, imageUrl: 'https://images.example/expired.png' }), /status 403/);
  assert.deepEqual(await fs.readdir(options.storageRoot), []);
});

test('rejects an HTML error page even if upstream claims it is an image', async (t) => {
  const options = await fixture(t);
  global.fetch = async () => new Response('<html>error</html>', { headers: { 'Content-Type': 'image/png' } });
  await assert.rejects(persistGeneratedImage({ ...options, imageUrl: 'https://images.example/result.png' }), /supported image/);
  assert.deepEqual(await fs.readdir(options.storageRoot), []);
});

test('rejects path-like task identifiers before downloading or writing', async (t) => {
  const options = await fixture(t);
  global.fetch = async () => { throw new Error('must not fetch'); };
  await assert.rejects(persistGeneratedImage({ ...options, imageUrl: 'https://images.example/result.png', taskId: '../escape' }), /task ID/);
  assert.deepEqual(await fs.readdir(options.storageRoot), []);
});
