process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const assert = require('node:assert/strict');
const test = require('node:test');

const { editImage, getEditStrategy } = require('../src/services/image-edit.service');

test('getEditStrategy recognizes current model support for image editing', () => {
  assert.equal(getEditStrategy('flux-2-max'), 'flux-2-max-edit');
  assert.equal(getEditStrategy('gemini-2.5-flash-image'), 'gemini-image-edit');
  assert.equal(getEditStrategy('gpt-image-1.5'), 'gpt-image-edit');
  assert.equal(getEditStrategy('wavespeed-ai/flux-schnell'), 'unsupported-wavespeed');
  assert.equal(getEditStrategy('text-only-model'), 'unsupported-openai-images');
});

test('editImage returns a mock success result for valid input', async () => {
  process.env.AI_PROVIDER = 'MOCK';
  process.env.IMAGE_MODEL = 'mock-image-edit-model';

  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/services/image-edit.service')];

  const {
    editImage: mockEditImage
  } = require('../src/services/image-edit.service');

  const result = await mockEditImage({
    imageUrl: 'http://localhost:3000/uploads/sample.png',
    prompt: 'modern villa facade at sunset'
  });

  assert.equal(result.success, true);
  assert.match(result.outputImageUrl, /^https:\/\/mock-render\.local\/results\/image-edit-/);
  assert.equal(result.provider, 'MOCK');
  assert.equal(result.strategy, 'mock-image-edit');
  assert.equal(result.rawResponse.provider, 'MOCK');
});

test('editImage returns a clear validation error for empty input', async () => {
  const result = await editImage({
    imageUrl: '',
    prompt: 'modern villa facade at sunset'
  });

  assert.equal(result.success, false);
  assert.equal(result.outputImageUrl, null);
  assert.equal(result.rawResponse, null);
  assert.equal(result.errorMessage, 'imageUrl is required');
});

test('editImage rejects unsupported image-edit models for 302AI', async () => {
  process.env.AI_PROVIDER = '302AI';
  process.env.IMAGE_MODEL = 'wavespeed-ai/flux-schnell';

  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/services/image-edit.service')];

  const {
    editImage: editImageVia302Ai
  } = require('../src/services/image-edit.service');

  const result = await editImageVia302Ai({
    imageUrl: 'http://localhost:3000/uploads/sample.png',
    prompt: 'modern villa facade at sunset'
  });

  assert.equal(result.success, false);
  assert.equal(result.outputImageUrl, null);
  assert.equal(result.provider, '302AI');
  assert.equal(result.strategy, 'unsupported-wavespeed');
  assert.match(result.errorMessage, /does not support image editing/i);
});

test.after(() => {
  process.env.AI_PROVIDER = 'MOCK';
  process.env.IMAGE_MODEL = 'mock-image-edit-model';

  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/services/image-edit.service')];
});
