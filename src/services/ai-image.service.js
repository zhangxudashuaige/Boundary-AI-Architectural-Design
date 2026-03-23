const { env } = require('../config/env');
const { logger } = require('../config/logger');

const DEFAULT_IMAGE_SIZE = '1024*1024';
const DEFAULT_OUTPUT_FORMAT = 'jpeg';
const DEFAULT_NUM_IMAGES = 1;
const DEFAULT_DATA_IMAGE_MIME_TYPE = 'image/png';
const OPENAI_IMAGE_ENDPOINTS = ['/v1/images/generations', '/302/images/generations'];
const GEMINI_IMAGE_ENDPOINT_SUFFIX = '?response_format';
const TERMINAL_TASK_STATUSES = new Set([
  'completed',
  'succeeded',
  'failed',
  'error',
  'canceled',
  'cancelled'
]);

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizePrompt = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSourceImageInput = (sourceImage, fallbackImageUrl = null) => {
  if (sourceImage && typeof sourceImage === 'object') {
    if (
      typeof sourceImage.imageUrl === 'string' &&
      sourceImage.imageUrl.trim()
    ) {
      return {
        type: 'image_url',
        imageUrl: sourceImage.imageUrl.trim()
      };
    }

    if (
      sourceImage.inlineData &&
      typeof sourceImage.inlineData.data === 'string' &&
      sourceImage.inlineData.data &&
      typeof sourceImage.inlineData.mimeType === 'string' &&
      sourceImage.inlineData.mimeType
    ) {
      return {
        type: 'inlineData',
        inlineData: {
          mimeType: sourceImage.inlineData.mimeType,
          data: sourceImage.inlineData.data
        }
      };
    }
  }

  if (typeof fallbackImageUrl === 'string' && fallbackImageUrl.trim()) {
    return {
      type: 'image_url',
      imageUrl: fallbackImageUrl.trim()
    };
  }

  return null;
};

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value));

const isWavespeedModel = (model) =>
  typeof model === 'string' && model.startsWith('wavespeed-ai/');

const isGeminiImageModel = (model) =>
  typeof model === 'string' &&
  model.startsWith('gemini-') &&
  model.includes('-image');

const getModelStrategy = (model) => {
  if (isWavespeedModel(model)) {
    return 'wavespeed';
  }

  if (isGeminiImageModel(model)) {
    return 'gemini-image';
  }

  return 'openai-images';
};

const isValidOutputImageUrl = (value) =>
  typeof value === 'string' &&
  value !== '' &&
  (/^https?:\/\//i.test(value) || value.startsWith('data:image/'));

const toDataImageUrl = (base64, mimeType = DEFAULT_DATA_IMAGE_MIME_TYPE) =>
  `data:${mimeType};base64,${base64}`;

const greatestCommonDivisor = (left, right) => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
};

const parseImageSize = (size) => {
  if (typeof size !== 'string') {
    return null;
  }

  const match = size.trim().match(/^(\d+)\s*[x*]\s*(\d+)$/i);

  if (!match) {
    return null;
  }

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
};

const sizeToAspectRatio = (size) => {
  const parsed = parseImageSize(size);

  if (!parsed) {
    return null;
  }

  const divisor = greatestCommonDivisor(parsed.width, parsed.height);

  return `${parsed.width / divisor}:${parsed.height / divisor}`;
};

const isSuccessfulPayload = (payload) => {
  if (!payload || payload.code === undefined || payload.code === null) {
    return true;
  }

  return [0, 200, '0', '200'].includes(payload.code);
};

const extractErrorMessage = (payload, fallbackMessage) =>
  payload?.data?.error ||
  payload?.error?.detail ||
  payload?.error?.message ||
  payload?.message ||
  fallbackMessage;

const extractResponseStatus = (rawResponse) =>
  rawResponse?.responseStatus ??
  rawResponse?.createResponseStatus ??
  rawResponse?.pollResponseStatus ??
  null;

const buildServiceResult = ({
  success,
  outputImageUrl = null,
  rawResponse = null,
  errorMessage = null,
  model = null
}) => ({
  success,
  outputImageUrl,
  rawResponse,
  errorMessage,
  model,
  responseStatus: extractResponseStatus(rawResponse)
});

const buildRequestUrl = (path) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  return `${env.ai.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
};

const buildTransportErrorMessage = (error) => {
  const baseMessage =
    error?.cause?.message ||
    error?.message ||
    'Unknown network error';

  return `302.AI request failed: ${baseMessage}`;
};

const requestJson = async (
  path,
  {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = env.ai.requestTimeoutMs
  } = {}
) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  timeoutHandle.unref?.();

  try {
    const response = await fetch(buildRequestUrl(path), {
      method,
      headers: {
        Authorization: env.ai.apiKey,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const payload = await parseResponsePayload(response);

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

const buildEmptyResponseFailure = ({ model, rawResponse, fallbackMessage }) =>
  buildServiceResult({
    success: false,
    outputImageUrl: null,
    rawResponse,
    errorMessage: '302.AI returned an empty response',
    model
  });

const buildInvalidResponseFailure = ({ model, rawResponse, fallbackMessage }) =>
  buildServiceResult({
    success: false,
    outputImageUrl: null,
    rawResponse,
    errorMessage: fallbackMessage || '302.AI returned a response format that is not supported',
    model
  });

const extractOpenAiImageUrl = (payload) => {
  const firstItem = Array.isArray(payload?.data) ? payload.data[0] : null;

  if (firstItem) {
    if (typeof firstItem.url === 'string' && firstItem.url) {
      return isValidOutputImageUrl(firstItem.url) ? firstItem.url : null;
    }

    if (typeof firstItem.image_url === 'string' && firstItem.image_url) {
      return isValidOutputImageUrl(firstItem.image_url)
        ? firstItem.image_url
        : null;
    }

    if (typeof firstItem.b64_json === 'string' && firstItem.b64_json) {
      return toDataImageUrl(firstItem.b64_json);
    }
  }

  const nestedImages =
    payload?.data?.task_result?.images || payload?.data?.images || payload?.images;
  const firstNestedImage = Array.isArray(nestedImages) ? nestedImages[0] : null;

  if (typeof firstNestedImage === 'string' && firstNestedImage) {
    return isValidOutputImageUrl(firstNestedImage) ? firstNestedImage : null;
  }

  if (typeof firstNestedImage?.url === 'string' && firstNestedImage.url) {
    return isValidOutputImageUrl(firstNestedImage.url)
      ? firstNestedImage.url
      : null;
  }

  if (
    typeof firstNestedImage?.b64_json === 'string' &&
    firstNestedImage.b64_json
  ) {
    return toDataImageUrl(firstNestedImage.b64_json);
  }

  return null;
};

const extractWavespeedImageUrl = (payload) => {
  const outputs = Array.isArray(payload?.data?.outputs) ? payload.data.outputs : [];
  const firstOutput = outputs[0] || null;

  return isValidOutputImageUrl(firstOutput) ? firstOutput : null;
};

const extractGeminiImageUrl = (payload) => {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : [];

    for (const part of parts) {
      if (typeof part?.url === 'string' && isValidOutputImageUrl(part.url)) {
        return part.url;
      }
    }

    for (const part of parts) {
      if (
        typeof part?.inlineData?.data === 'string' &&
        part.inlineData.data
      ) {
        return toDataImageUrl(
          part.inlineData.data,
          part.inlineData.mimeType || DEFAULT_DATA_IMAGE_MIME_TYPE
        );
      }
    }
  }

  return null;
};

const buildGeminiImageRequestBody = ({ prompt, size, sourceImage }) => {
  const parts = [{ text: prompt }];
  const aspectRatio = sizeToAspectRatio(size);

  if (
    sourceImage?.type === 'image_url' &&
    typeof sourceImage.imageUrl === 'string' &&
    sourceImage.imageUrl
  ) {
    parts.push({
      image_url: sourceImage.imageUrl
    });
  } else if (
    sourceImage?.type === 'inlineData' &&
    sourceImage.inlineData?.mimeType &&
    sourceImage.inlineData?.data
  ) {
    parts.push({
      inlineData: {
        mimeType: sourceImage.inlineData.mimeType,
        data: sourceImage.inlineData.data
      }
    });
  }

  return {
    contents: [
      {
        parts
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {})
    }
  };
};

const generateViaGeminiImageApi = async ({
  prompt,
  model,
  size,
  sourceImage
}) => {
  const endpoint = `/google/v1/models/${model}${GEMINI_IMAGE_ENDPOINT_SUFFIX}`;
  const { response, payload } = await requestJson(endpoint, {
    method: 'POST',
    body: buildGeminiImageRequestBody({
      prompt,
      size,
      sourceImage
    })
  });
  const rawResponse = {
    endpoint,
    responseStatus: response?.status || null,
    result: payload
  };

  if (!payload) {
    logger.warn({ endpoint, model }, '302.AI Gemini image generation returned an empty response');
    return buildEmptyResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI Gemini image generation failed'
    });
  }

  if (payload?.raw) {
    logger.warn(
      { endpoint, model, responseStatus: response?.status || null },
      '302.AI Gemini image generation returned a non-JSON response'
    );
    return buildInvalidResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI Gemini image generation returned a non-JSON response'
    });
  }

  const outputImageUrl = extractGeminiImageUrl(payload);

  if (!response?.ok || !outputImageUrl) {
    const errorMessage = extractErrorMessage(
      payload,
      outputImageUrl
        ? '302.AI Gemini image generation failed'
        : '302.AI Gemini image generation result format is invalid'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse,
      errorMessage,
      model
    });
  }

  return buildServiceResult({
    success: true,
    outputImageUrl,
    rawResponse,
    model
  });
};

const generateViaOpenAiImagesApi = async ({
  prompt,
  model,
  size,
  numImages
}) => {
  let lastAttempt = null;

  for (const endpoint of OPENAI_IMAGE_ENDPOINTS) {
    const attempt = await requestJson(endpoint, {
      method: 'POST',
      body: {
        model,
        prompt,
        n: numImages,
        response_format: 'url',
        size
      }
    });

    lastAttempt = {
      endpoint,
      response: attempt.response,
      payload: attempt.payload
    };

    if (
      attempt.response.ok &&
      isSuccessfulPayload(attempt.payload) &&
      extractOpenAiImageUrl(attempt.payload)
    ) {
      lastAttempt = {
        endpoint,
        response: attempt.response,
        payload: attempt.payload
      };
      break;
    }

    if (![404, 405].includes(attempt.response.status)) {
      break;
    }
  }

  const { endpoint, response, payload } = lastAttempt || {};
  const rawResponse = {
    endpoint,
    responseStatus: response?.status || null,
    result: payload
  };

  if (!payload) {
    logger.warn({ endpoint, model }, '302.AI image generation returned an empty response');
    return buildEmptyResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI image generation failed'
    });
  }

  if (payload?.raw) {
    logger.warn(
      { endpoint, model, responseStatus: response?.status || null },
      '302.AI image generation returned a non-JSON response'
    );
    return buildInvalidResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI returned a non-JSON image generation response'
    });
  }

  const outputImageUrl = extractOpenAiImageUrl(payload);

  if (!response?.ok || !isSuccessfulPayload(payload) || !outputImageUrl) {
    const errorMessage = extractErrorMessage(
      payload,
      outputImageUrl
        ? '302.AI image generation failed'
        : '302.AI image generation result format is invalid'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse,
      errorMessage,
      model
    });
  }

  return buildServiceResult({
    success: true,
    outputImageUrl,
    rawResponse,
    model
  });
};

const pollWavespeedTask = async ({
  pollUrl,
  model,
  pollIntervalMs,
  pollAttempts,
  createPayload
}) => {
  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    await sleep(pollIntervalMs);

    const { response, payload } = await requestJson(pollUrl, {
      method: 'GET'
    });
    const taskStatus = String(payload?.data?.status || '').toLowerCase();
    const rawResponse = {
      create: createPayload,
      result: payload,
      pollResponseStatus: response?.status || null,
      attempts: attempt
    };

    if (!payload) {
      logger.warn(
        { model, pollUrl, attempts: attempt },
        '302.AI Wavespeed task polling returned an empty response'
      );
      return buildEmptyResponseFailure({
        model,
        rawResponse,
        fallbackMessage: '302.AI Wavespeed task polling failed'
      });
    }

    if (payload?.raw) {
      logger.warn(
        { model, pollUrl, attempts: attempt },
        '302.AI Wavespeed task polling returned a non-JSON response'
      );
      return buildInvalidResponseFailure({
        model,
        rawResponse,
        fallbackMessage: '302.AI Wavespeed task polling returned a non-JSON response'
      });
    }

    if (!response.ok || !isSuccessfulPayload(payload)) {
      const errorMessage = extractErrorMessage(
        payload,
        '302.AI Wavespeed task polling failed'
      );

      return buildServiceResult({
        success: false,
        outputImageUrl: null,
        rawResponse,
        errorMessage,
        model
      });
    }

    if (!TERMINAL_TASK_STATUSES.has(taskStatus)) {
      continue;
    }

    if (taskStatus === 'completed' || taskStatus === 'succeeded') {
      const outputImageUrl = extractWavespeedImageUrl(payload);

      if (!outputImageUrl) {
        return buildServiceResult({
          success: false,
          outputImageUrl: null,
          rawResponse,
          errorMessage: '302.AI returned a completed task with an invalid image result format',
          model
        });
      }

      return buildServiceResult({
        success: true,
        outputImageUrl,
        rawResponse,
        model
      });
    }

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse,
      errorMessage: extractErrorMessage(
        payload,
        `302.AI Wavespeed task ended with status: ${taskStatus}`
      ),
      model
    });
  }

  return buildServiceResult({
    success: false,
    outputImageUrl: null,
    rawResponse: {
      create: createPayload,
      result: {
        message: `302.AI Wavespeed task did not finish after ${pollAttempts} polling attempts`
      },
      pollResponseStatus: null,
      attempts: pollAttempts
    },
    errorMessage: '302.AI image generation polling timed out',
    model
  });
};

const generateViaWavespeedApi = async ({
  prompt,
  model,
  size,
  numImages,
  outputFormat,
  pollIntervalMs,
  pollAttempts
}) => {
  const { response, payload } = await requestJson(`/ws/api/v3/${model}`, {
    method: 'POST',
    body: {
      enable_base64_output: false,
      enable_sync_mode: false,
      num_images: numImages,
      output_format: outputFormat,
      prompt,
      seed: -1,
      size
    }
  });
  const rawResponse = {
    create: payload,
    createResponseStatus: response?.status || null
  };

  if (!payload) {
    logger.warn({ model }, '302.AI Wavespeed task creation returned an empty response');
    return buildEmptyResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI Wavespeed task creation failed'
    });
  }

  if (payload?.raw) {
    logger.warn(
      { model, responseStatus: response?.status || null },
      '302.AI Wavespeed task creation returned a non-JSON response'
    );
    return buildInvalidResponseFailure({
      model,
      rawResponse,
      fallbackMessage: '302.AI Wavespeed task creation returned a non-JSON response'
    });
  }

  if (!response.ok || !isSuccessfulPayload(payload)) {
    const errorMessage = extractErrorMessage(
      payload,
      '302.AI Wavespeed task creation failed'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse,
      errorMessage,
      model
    });
  }

  const outputImageUrl = extractWavespeedImageUrl(payload);

  if (outputImageUrl) {
    return buildServiceResult({
      success: true,
      outputImageUrl,
      rawResponse: {
        create: payload,
        result: payload,
        createResponseStatus: response.status,
        pollResponseStatus: response.status,
        attempts: 0
      },
      model
    });
  }

  const pollUrl = payload?.data?.urls?.get;

  if (!pollUrl) {
    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse,
      errorMessage: '302.AI Wavespeed response did not include a task polling URL',
      model
    });
  }

  return pollWavespeedTask({
    pollUrl,
    model,
    pollIntervalMs,
    pollAttempts,
    createPayload: payload
  });
};

const generateImage = async ({
  prompt,
  model = env.ai.imageModel,
  size = DEFAULT_IMAGE_SIZE,
  numImages = DEFAULT_NUM_IMAGES,
  outputFormat = DEFAULT_OUTPUT_FORMAT,
  sourceImage = null,
  imageUrl = null,
  pollIntervalMs = env.ai.pollIntervalMs,
  pollAttempts = env.ai.pollAttempts
} = {}) => {
  const normalizedPrompt = normalizePrompt(prompt);
  const normalizedSourceImage = normalizeSourceImageInput(sourceImage, imageUrl);

  if (env.ai.provider !== '302AI') {
    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: null,
      errorMessage: `Unsupported AI provider: ${env.ai.provider}`,
      model
    });
  }

  if (!normalizedPrompt) {
    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: null,
      errorMessage: 'prompt is required',
      model
    });
  }

  try {
    const strategy = getModelStrategy(model);

    if (strategy === 'wavespeed') {
      return await generateViaWavespeedApi({
        prompt: normalizedPrompt,
        model,
        size,
        numImages,
        outputFormat,
        pollIntervalMs,
        pollAttempts
      });
    }

    if (strategy === 'gemini-image') {
      return await generateViaGeminiImageApi({
        prompt: normalizedPrompt,
        model,
        size,
        sourceImage: normalizedSourceImage
      });
    }

    return await generateViaOpenAiImagesApi({
      prompt: normalizedPrompt,
      model,
      size,
      numImages
    });
  } catch (error) {
    logger.error(
      { err: error, model },
      '302.AI image generation request failed before receiving a valid result'
    );

    return buildServiceResult({
      success: false,
      outputImageUrl: null,
      rawResponse: null,
      errorMessage: error.message,
      model
    });
  }
};

module.exports = {
  generateImage
};
