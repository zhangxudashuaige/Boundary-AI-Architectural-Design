const { logger } = require('../config/logger');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const PROMPT_REFINE_STRATEGY = '302ai-llm-prompt-refine-v1';
const SERVICE_UNAVAILABLE_MESSAGE = '\u670d\u52a1\u5668\u7e41\u5fd9\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';

const containsCjkCharacters = (value) =>
  typeof value === 'string' && /[\u3400-\u9fff]/u.test(value);

const normalizePrompt = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const cleanModelText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^```(?:json|text)?/i, '')
    .replace(/```$/i, '')
    .trim()
    .replace(/^["'\u201c\u201d\u2018\u2019\s]+|["'\u201c\u201d\u2018\u2019\s]+$/g, '')
    .trim();
};

const requestPromptRefineVia302Ai = async (rawPrompt) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, env.ai.promptRequestTimeoutMs);

  timeoutHandle.unref?.();

  try {
    const response = await fetch(`${env.ai.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: env.ai.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.ai.promptModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '\u4f60\u8d1f\u8d23\u4f18\u5316\u5efa\u7b51\u56fe\u50cf\u7f16\u8f91\u63d0\u793a\u8bcd\u3002\u53ea\u8fd4\u56de\u4e00\u53e5\u7b80\u6d01\u7684\u7b80\u4f53\u4e2d\u6587\u63d0\u793a\u8bcd\uff0c\u4fdd\u7559\u539f\u59cb\u8bbe\u8ba1\u610f\u56fe\u3001\u4f53\u91cf\u5173\u7cfb\u548c\u5173\u952e\u9700\u6c42\uff0c\u8865\u5145\u98ce\u683c\u3001\u6750\u8d28\u3001\u5149\u7ebf\u3001\u955c\u5934\u611f\u548c\u771f\u5b9e\u5ea6\u3002\u4e0d\u8981\u8fd4\u56de JSON\u3001Markdown\u3001\u89e3\u91ca\u6216\u591a\u53e5\u5185\u5bb9\u3002'
          },
          {
            role: 'user',
            content: `${rawPrompt}\n\n\u8bf7\u53ea\u8f93\u51fa\u4e00\u53e5\u7b80\u4f53\u4e2d\u6587\u7684\u4f18\u5316\u540e\u63cf\u8ff0\uff0c\u4e0d\u8981\u89e3\u91ca\uff0c\u4e0d\u8981\u5206\u70b9\uff0c\u4e0d\u8981\u8f93\u51fa\u82f1\u6587\u3002`
          }
        ]
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    const modelText = cleanModelText(
      payload?.choices?.[0]?.message?.content || ''
    );

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          payload?.message ||
          `Prompt refine request failed with status ${response.status}`
      );
    }

    if (!modelText) {
      throw new Error('Prompt refine model returned empty content');
    }

    if (!containsCjkCharacters(modelText)) {
      throw new Error('Prompt refine model returned non-Chinese content');
    }

    return {
      refinedPrompt: modelText,
      responseStatus: response.status
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Prompt refine request timed out after ${env.ai.promptRequestTimeoutMs}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const refinePrompt = async (rawPrompt) => {
  const normalizedPrompt = normalizePrompt(rawPrompt);

  logger.info(
    {
      strategy: PROMPT_REFINE_STRATEGY,
      promptLength: normalizedPrompt.length,
      provider: env.ai.provider,
      model: env.ai.promptModel
    },
    'Prompt refinement started'
  );

  if (!normalizedPrompt) {
    throw new Error('rawPrompt is required');
  }

  if (env.ai.provider !== '302AI') {
    logger.warn(
      {
        strategy: PROMPT_REFINE_STRATEGY,
        provider: env.ai.provider
      },
      'Prompt refinement is unavailable for the current provider'
    );

    throw new AppError(SERVICE_UNAVAILABLE_MESSAGE, 503);
  }

  try {
    const llmResult = await requestPromptRefineVia302Ai(normalizedPrompt);

    logger.info(
      {
        strategy: PROMPT_REFINE_STRATEGY,
        provider: env.ai.provider,
        model: env.ai.promptModel,
        responseStatus: llmResult.responseStatus,
        refinedPromptLength: llmResult.refinedPrompt.length
      },
      'Prompt refinement completed with LLM'
    );

    return {
      rawPrompt: normalizedPrompt,
      refinedPrompt: llmResult.refinedPrompt,
      strategy: `302ai:${env.ai.promptModel}`,
      attributes: null
    };
  } catch (error) {
    logger.warn(
      {
        err: error,
        strategy: PROMPT_REFINE_STRATEGY,
        provider: env.ai.provider,
        model: env.ai.promptModel
      },
      'Prompt refinement failed'
    );

    throw new AppError(SERVICE_UNAVAILABLE_MESSAGE, 503);
  }
};

module.exports = {
  PROMPT_REFINE_STRATEGY,
  SERVICE_UNAVAILABLE_MESSAGE,
  refinePrompt
};
