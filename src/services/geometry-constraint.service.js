const crypto = require('crypto');

const { env } = require('../config/env');
const { logger } = require('../config/logger');
const { resolveSourceImageInput } = require('./source-image-input.service');

const GEOMETRY_ANALYSIS_STRATEGY = '302ai-geometry-constraint-v1';
const MAX_CACHE_ENTRIES = 100;

const geometryConstraintCache = new Map();
const inflightGeometryRequests = new Map();

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeStringList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 6);
};

const cleanModelText = (value) => {
  if (typeof value === 'string') {
    return value
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (typeof item?.text === 'string') {
          return item.text;
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
};

const parseJsonObject = (value) => {
  const normalized = cleanModelText(value);

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (nestedError) {
      return null;
    }
  }
};

const buildImageContentPart = (sourceImage) => {
  if (
    sourceImage?.type === 'image_url' &&
    typeof sourceImage.imageUrl === 'string' &&
    sourceImage.imageUrl
  ) {
    return {
      type: 'image_url',
      image_url: {
        url: sourceImage.imageUrl
      }
    };
  }

  if (
    sourceImage?.type === 'inlineData' &&
    sourceImage.inlineData?.mimeType &&
    sourceImage.inlineData?.data
  ) {
    return {
      type: 'image_url',
      image_url: {
        url: `data:${sourceImage.inlineData.mimeType};base64,${sourceImage.inlineData.data}`
      }
    };
  }

  throw new Error('Unable to resolve source image for geometry analysis');
};

const normalizeGeometryConstraint = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const normalized = {
    summary: normalizeString(source.summary),
    massing: normalizeStringList(source.massing),
    topology: normalizeStringList(source.topology),
    shapeLanguage: normalizeStringList(source.shapeLanguage),
    camera: normalizeStringList(source.camera),
    forbidden: normalizeStringList(source.forbidden)
  };

  if (!normalized.summary) {
    normalized.summary = [
      ...normalized.massing,
      ...normalized.topology,
      ...normalized.shapeLanguage
    ]
      .slice(0, 3)
      .join('; ');
  }

  return normalized;
};

const hasGeometryConstraintContent = (constraint) =>
  Boolean(
    normalizeString(constraint?.summary) ||
      constraint?.massing?.length ||
      constraint?.topology?.length ||
      constraint?.shapeLanguage?.length ||
      constraint?.camera?.length ||
      constraint?.forbidden?.length
  );

const isGeometryAnalysisEnabled = () =>
  env.ai.provider === '302AI' && normalizeString(env.ai.geometryModel) !== '';

const buildGeometryCacheKey = (imageUrl) =>
  crypto.createHash('sha1').update(normalizeString(imageUrl)).digest('hex');

const setGeometryCacheEntry = (cacheKey, value) => {
  geometryConstraintCache.set(cacheKey, value);

  if (geometryConstraintCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const oldestKey = geometryConstraintCache.keys().next().value;

  if (oldestKey) {
    geometryConstraintCache.delete(oldestKey);
  }
};

const requestGeometryConstraintVia302Ai = async ({ imageUrl }) => {
  const sourceImage = await resolveSourceImageInput(imageUrl);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, env.ai.geometryRequestTimeoutMs);

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
        model: env.ai.geometryModel,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You extract architectural geometry constraints for image editing. Return JSON only. Focus on massing, topology, shape language, camera/composition, and forbidden redesign directions. Do not mention materials, lighting, mood, rendering quality, or landscape. Use this exact JSON shape: {"summary":"","massing":[],"topology":[],"shapeLanguage":[],"camera":[],"forbidden":[]}. Keep each array item short and concrete.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Analyze the main building in this image. Extract the geometry facts that must remain unchanged during rendering. Return valid JSON only.'
              },
              buildImageContentPart(sourceImage)
            ]
          }
        ]
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          payload?.message ||
          `Geometry analysis request failed with status ${response.status}`
      );
    }

    const parsed = parseJsonObject(payload?.choices?.[0]?.message?.content);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Geometry analysis model returned invalid JSON content');
    }

    const geometryConstraint = normalizeGeometryConstraint(parsed);

    if (!hasGeometryConstraintContent(geometryConstraint)) {
      throw new Error('Geometry analysis model returned empty constraints');
    }

    return {
      geometryConstraint,
      responseStatus: response.status
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Geometry analysis request timed out after ${env.ai.geometryRequestTimeoutMs}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const extractGeometryConstraint = async ({ imageUrl }) => {
  const normalizedImageUrl = normalizeString(imageUrl);

  if (!normalizedImageUrl || !isGeometryAnalysisEnabled()) {
    return null;
  }

  const cacheKey = buildGeometryCacheKey(normalizedImageUrl);
  const cachedResult = geometryConstraintCache.get(cacheKey);

  if (cachedResult) {
    return {
      ...cachedResult,
      cached: true
    };
  }

  if (inflightGeometryRequests.has(cacheKey)) {
    return inflightGeometryRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    logger.info(
      {
        strategy: GEOMETRY_ANALYSIS_STRATEGY,
        provider: env.ai.provider,
        model: env.ai.geometryModel
      },
      'Geometry analysis started'
    );

    try {
      const result = await requestGeometryConstraintVia302Ai({
        imageUrl: normalizedImageUrl
      });
      const analysisResult = {
        strategy: GEOMETRY_ANALYSIS_STRATEGY,
        provider: env.ai.provider,
        model: env.ai.geometryModel,
        geometryConstraint: result.geometryConstraint
      };

      setGeometryCacheEntry(cacheKey, analysisResult);

      logger.info(
        {
          strategy: GEOMETRY_ANALYSIS_STRATEGY,
          provider: env.ai.provider,
          model: env.ai.geometryModel,
          responseStatus: result.responseStatus,
          summary: result.geometryConstraint.summary
        },
        'Geometry analysis completed'
      );

      return {
        ...analysisResult,
        cached: false
      };
    } catch (error) {
      logger.warn(
        {
          err: error,
          strategy: GEOMETRY_ANALYSIS_STRATEGY,
          provider: env.ai.provider,
          model: env.ai.geometryModel
        },
        'Geometry analysis failed'
      );

      return null;
    } finally {
      inflightGeometryRequests.delete(cacheKey);
    }
  })();

  inflightGeometryRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

module.exports = {
  GEOMETRY_ANALYSIS_STRATEGY,
  extractGeometryConstraint,
  hasGeometryConstraintContent,
  isGeometryAnalysisEnabled,
  normalizeGeometryConstraint
};
