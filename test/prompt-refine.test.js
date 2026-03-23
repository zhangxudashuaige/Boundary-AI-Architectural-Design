process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.AI_PROVIDER = 'MOCK';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PROMPT_REFINE_STRATEGY,
  SERVICE_UNAVAILABLE_MESSAGE,
  refinePrompt
} = require('../src/services/prompt-refine.service');

test('refinePrompt rejects empty input', async () => {
  await assert.rejects(() => refinePrompt('   '), /rawPrompt is required/);
});

test('refinePrompt returns service unavailable when provider cannot refine prompts', async () => {
  await assert.rejects(
    () => refinePrompt('modern concrete villa facade with large glass openings at sunset'),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.message, SERVICE_UNAVAILABLE_MESSAGE);
      return true;
    }
  );
});

test('prompt refine strategy constant stays aligned with the LLM-only flow', () => {
  assert.equal(PROMPT_REFINE_STRATEGY, '302ai-llm-prompt-refine-v1');
});
