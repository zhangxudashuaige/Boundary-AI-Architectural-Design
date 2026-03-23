const crypto = require('crypto');

const { env } = require('../config/env');
const { logger } = require('../config/logger');
const { generateImage } = require('./ai-image.service');
const { resolveSourceImageInput } = require('./source-image-input.service');

const isWavespeedModel = (model) =>
  typeof model === 'string' && model.startsWith('wavespeed-ai/');

const normalizeFluxModel = (model) =>
  typeof model === 'string'
    ? model.trim().toLowerCase().replace(/^\/?flux\/v1\//, '')
    : '';

const isFlux2MaxModel = (model) => normalizeFluxModel(model) === 'flux-2-max';

const isGeminiImageModel = (model) =>
  typeof model === 'string' &&
  model.startsWith('gemini-') &&
  model.includes('-image');

const getEditStrategy = (model) => {
  if (isFlux2MaxModel(model)) {
    return 'flux-2-max-edit';
  }

  if (isGeminiImageModel(model)) {
    return 'gemini-image-edit';
  }

  if (isWavespeedModel(model)) {
    return 'unsupported-wavespeed';
  }

  return 'unsupported-openai-images';
};

const buildServiceResult = ({
  success,
  outputImageUrl = null,
  rawResponse = null,
  errorMessage = null,
  provider = env.ai.provider,
  model = env.ai.imageModel,
  strategy = getEditStrategy(model)
}) => ({
  success,
  outputImageUrl,
  rawResponse,
  errorMessage,
  provider,
  model,
  strategy
});

const extractResponseStatus = (rawResponse) =>
  rawResponse?.responseStatus ??
  rawResponse?.createResponseStatus ??
  rawResponse?.pollResponseStatus ??
  null;

const summarizeImageUrlMode = (imageUrl) => {
  if (typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return 'missing';
  }

  if (imageUrl.startsWith('data:image/')) {
    return 'data-url';
  }

  if (/^https?:\/\/.+\/uploads\//i.test(imageUrl) || /^uploads\//i.test(imageUrl)) {
    return 'uploads';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return 'remote-url';
  }

  return 'unknown';
};

const summarizeOutputImageUrlForLog = (value) => {
  if (typeof value !== 'string' || value === '') {
    return value;
  }

  if (value.startsWith('data:image/')) {
    return `[data-url length=${value.length}]`;
  }

  return value;
};

const toDataUrl = (mimeType, data) => `data:${mimeType};base64,${data}`;

const buildTransportErrorMessage = (error) => {
  const baseMessage =
    error?.cause?.message ||
    error?.message ||
    'Unknown network error';

  return `302.AI request failed: ${baseMessage}`;
};

const request302AiJson = async (
  path,
  {
    method = 'GET',
    body,
    timeoutMs = env.ai.requestTimeoutMs
  } = {}
) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  timeoutHandle.unref?.();

  try {
    const response = await fetch(`${env.ai.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: env.ai.apiKey,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);

    return {
      response,
      payload
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`302.AI request timed out after ${timeoutMs}ms`);
    }

    throw new Error(buildTransportErrorMessage(error));
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const resolveFluxReferenceImage = async (imageUrl) => {
  const sourceImage = await resolveSourceImageInput(imageUrl);

  if (sourceImage?.type === 'image_url' && sourceImage.imageUrl) {
    return sourceImage.imageUrl;
  }

  if (
    sourceImage?.type === 'inlineData' &&
    sourceImage.inlineData?.mimeType &&
    sourceImage.inlineData?.data
  ) {
    return toDataUrl(
      sourceImage.inlineData.mimeType,
      sourceImage.inlineData.data
    );
  }

  throw new Error('Unable to resolve source image for Flux-2-Max image editing');
};

const extractFluxOutputImageUrl = (payload) =>
  payload?.result?.sample ||
  (Array.isArray(payload?.result?.samples) ? payload.result.samples[0] : null) ||
  null;

const validateEditInput = ({ imageUrl, prompt }) => {
  if (typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return 'imageUrl is required';
  }

  if (typeof prompt !== 'string' || prompt.trim() === '') {
    return 'prompt is required';
  }

  return null;
};

const buildMockOutputImageUrl = () =>
  `https://mock-render.local/results/image-edit-${crypto.randomUUID()}.webp`;

const editImageViaMockProvider = async ({ imageUrl, prompt, model }) =>
  buildServiceResult({
    success: true,
    outputImageUrl: buildMockOutputImageUrl(),
    rawResponse: {
      provider: 'MOCK',
      imageUrl,
      prompt,
      message: 'Mock image edit completed'
    },
    model,
    strategy: 'mock-image-edit'
  });

const editImageVia302Ai = async ({ imageUrl, prompt, model }) => {
  const strategy = getEditStrategy(model);

  if (strategy === 'flux-2-max-edit') {
    let referenceImage = null;

    try {
      referenceImage = await resolveFluxReferenceImage(imageUrl);
    } catch (error) {
      logger.warn(
        {
          provider: '302AI',
          model,
          strategy,
          imageUrlMode: summarizeImageUrlMode(imageUrl),
          errorMessage: error.message
        },
        'Image edit source image resolution failed'
      );

      return buildServiceResult({
        success: false,
        outputImageUrl: null,
        rawResponse: {
          provider: '302AI',
          imageUrl,
          prompt
        },
        errorMessage: error.message,
        model,
        strategy
      });
    }

    const createAttempt = await request302AiJson('/flux/v1/flux-2-max', {
      method: 'POST',
      body: {
        prompt,
        width: 1024,
        height: 1024,
        output_format: 'jpeg',
        sync: false,
        reference_images: [referenceImage]
      }
    });

    const immediateOutputImageUrl = extractFluxOutputImageUrl(createAttempt.payload);

    if (immediateOutputImageUrl) {
      return buildServiceResult({
        success: true,
        outputImageUrl: immediateOutputImageUrl,
        rawResponse: {
          create: createAttempt.payload,
          result: createAttempt.payload,
          createResponseStatus: createAttempt.response?.status || null,
          pollResponseStatus: createAttempt.response?.status || null,
          attempts: 0
        },
        model,
        strategy
      });
    }

    const taskId = createAttempt.payload?.id;

    if (!taskId) {
      return buildServiceResult({
        success: false,
        outputImageUrl: null,
        rawResponse: {
          create: createAttempt.payload,
          createResponseStatus: createAttempt.response?.status || null
        },
        errorMessage:
          createAttempt.payload?.error?.message ||
          createAttempt.payload?.message ||
          'Flux-2-Max did not return a task id',
        model,
        strategy
      });
    }

    for (let attempt = 1; attempt <= env.ai.pollAttempts; attempt += 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, env.ai.pollIntervalMs);
      });

      const pollAttempt = await request302AiJson(
        `/flux/v1/get_result?id=${encodeURIComponent(taskId)}`,
        {
          method: 'GET'
        }
      );
      const outputImageUrl = extractFluxOutputImageUrl(pollAttempt.payload);
      const status = String(pollAttempt.payload?.status || '').toLowerCase();

      if (outputImageUrl) {
        return buildServiceResult({
          success: true,
          outputImageUrl,
          rawResponse: {
            create: createAttempt.payload,
            result: pollAttempt.payload,
            createResponseStatus: createAttempt.response?.status || null,
            pollResponseStatus: pollAttempt.response?.status || null,
            attempts: attempt
          },
          model,
          strategy
        });
      }

      if (['failed', 'error'].includes(status)) {
        return buildServiceResult({
          success: false,
          outputImageUrl: null,
          rawResponse: {
            create: createAttempt.payload,
            result: pollAttempt.payload,
            createResponseStatus: createAttempt.response?.status || null,
            pollResponseStatus: pollAttempt.response?.status || null,
            attempts: attempt
          },
          errorMessage:
            pollAttempt.payload?.error?.message ||
            pollAttempt.payload?.message ||
            `Flux-2-Max task ended with status: ${pollAttempt.payload?.status || 'unknown'}`,
          model,
          strategy
        });
      }
    }

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: {
        create: createAttempt.payload,
        createResponseStatus: createAttempt.response?.status || null,
        attempts: env.ai.pollAttempts
      },
      errorMessage: 'Flux-2-Max image edit polling timed out',
      model,
      strategy
    });
  }

  if (strategy !== 'gemini-image-edit') {
    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: {
        provider: '302AI',
        imageUrl,
        prompt
      },
      errorMessage: `Model ${model} does not support image editing in the current 302.AI adapter. Configure a Gemini image model or add a dedicated adapter.`,
      model,
      strategy
    });
  }

  let sourceImage = null;

  try {
    sourceImage = await resolveSourceImageInput(imageUrl);
  } catch (error) {
    logger.warn(
      {
        provider: '302AI',
        model,
        strategy,
        imageUrlMode: summarizeImageUrlMode(imageUrl),
        errorMessage: error.message
      },
      'Image edit source image resolution failed'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: {
        provider: '302AI',
        imageUrl,
        prompt
      },
      errorMessage: error.message,
      model,
      strategy
    });
  }

  const generationResult = await generateImage({
    prompt,
    model,
    sourceImage,
    imageUrl
  });

  return buildServiceResult({
    success: generationResult.success,
    outputImageUrl: generationResult.outputImageUrl,
    rawResponse: generationResult.rawResponse,
    errorMessage: generationResult.errorMessage,
    model,
    strategy
  });
};

const editImage = async ({
  imageUrl,
  prompt,
  model = env.ai.imageModel,
  provider = env.ai.provider
} = {}) => {
  const normalizedImageUrl =
    typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl;
  const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : prompt;
  const strategy = getEditStrategy(model);
  const validationError = validateEditInput({ imageUrl, prompt });

  if (validationError) {
    logger.warn(
      {
        provider,
        model,
        strategy,
        imageUrlMode: summarizeImageUrlMode(normalizedImageUrl),
        promptLength: typeof normalizedPrompt === 'string' ? normalizedPrompt.length : 0,
        errorMessage: validationError
      },
      'Image edit model call failed validation'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: null,
      errorMessage: validationError,
      provider,
      model
    });
  }

  try {
    logger.info(
      {
        provider,
        model,
        strategy,
        imageUrlMode: summarizeImageUrlMode(normalizedImageUrl),
        promptLength: normalizedPrompt.length
      },
      'Image edit model call started'
    );

    let result = null;

    if (provider === 'MOCK') {
      result = await editImageViaMockProvider({
        imageUrl: normalizedImageUrl,
        prompt: normalizedPrompt,
        model
      });
    } else if (provider === '302AI') {
      result = await editImageVia302Ai({
        imageUrl: normalizedImageUrl,
        prompt: normalizedPrompt,
        model
      });
    } else {
      result = buildServiceResult({
        success: false,
        outputImageUrl: null,
        rawResponse: null,
        errorMessage: `Unsupported image edit provider: ${provider}`,
        provider,
        model,
        strategy
      });
    }

    if (!result.success || !result.outputImageUrl) {
      logger.warn(
        {
          provider: result.provider || provider,
          model: result.model || model,
          strategy: result.strategy || strategy,
          imageUrlMode: summarizeImageUrlMode(normalizedImageUrl),
          responseStatus: extractResponseStatus(result.rawResponse),
          errorMessage: result.errorMessage
        },
        'Image edit model call failed'
      );
    } else {
      logger.info(
        {
          provider: result.provider || provider,
          model: result.model || model,
          strategy: result.strategy || strategy,
          imageUrlMode: summarizeImageUrlMode(normalizedImageUrl),
          responseStatus: extractResponseStatus(result.rawResponse),
          outputImageUrl: summarizeOutputImageUrlForLog(result.outputImageUrl)
        },
        'Image edit model call completed'
      );
    }

    return result;
  } catch (error) {
    logger.error(
      {
        err: error,
        provider,
        model,
        strategy,
        imageUrlMode: summarizeImageUrlMode(normalizedImageUrl)
      },
      'Image edit model call failed before receiving a valid result'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: null,
      errorMessage: error.message,
      provider,
      model
    });
  }
};

module.exports = {
  editImage,
  getEditStrategy
};
