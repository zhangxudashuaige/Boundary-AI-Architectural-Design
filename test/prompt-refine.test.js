process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.AI_PROVIDER = 'MOCK';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PROMPT_REFINE_STRATEGY,
  refinePrompt
} = require('../src/services/prompt-refine.service');

test('refinePrompt returns a stable structured result for architectural prompts', async () => {
  const result = await refinePrompt(
    'modern concrete villa facade with large glass openings at sunset'
  );

  assert.equal(
    result.rawPrompt,
    'modern concrete villa facade with large glass openings at sunset'
  );
  assert.equal(result.strategy, PROMPT_REFINE_STRATEGY);
  assert.equal(result.attributes.buildingType, 'villa residence');
  assert.match(result.attributes.styles.join(', '), /modern contemporary/i);
  assert.match(result.attributes.materials.join(', '), /exposed concrete/i);
  assert.match(result.attributes.materials.join(', '), /floor-to-ceiling glass/i);
  assert.match(result.attributes.lighting, /sunset/i);
  assert.match(result.attributes.photography, /architectural photography/i);
  assert.match(result.attributes.realism, /photorealistic/i);
  assert.match(
    result.refinedPrompt,
    /architectural visualization of villa residence/i
  );
});

test('refinePrompt recognizes Chinese architectural descriptors', async () => {
  const result = await refinePrompt('现代别墅外立面，白墙木格栅，黄昏氛围');

  assert.equal(result.attributes.buildingType, 'villa residence');
  assert.match(result.attributes.styles.join(', '), /modern contemporary/i);
  assert.match(result.attributes.materials.join(', '), /smooth light plaster/i);
  assert.match(result.attributes.materials.join(', '), /warm wood cladding/i);
  assert.match(result.attributes.lighting, /golden-hour sunset lighting/i);
  assert.match(result.refinedPrompt, /wide-angle architectural photography/i);
});

test('refinePrompt rejects empty input', async () => {
  await assert.rejects(() => refinePrompt('   '), /rawPrompt is required/);
});
