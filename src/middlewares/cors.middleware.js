const { env } = require('../config/env');
const { logger } = require('../config/logger');

const NO_CONTENT_STATUS = 204;

const normalizeOrigin = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch (error) {
    return '';
  }
};

const resolveAllowedOrigin = (origin) => {
  const requestOrigin = normalizeOrigin(origin);

  if (!requestOrigin) {
    return '';
  }

  if (env.cors.allowedOrigins.includes('*')) {
    return '*';
  }

  return env.cors.allowedOrigins.includes(requestOrigin) ? requestOrigin : '';
};

const applyCorsHeaders = (response, allowedOrigin) => {
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', env.cors.allowedMethods);
  response.setHeader('Access-Control-Allow-Headers', env.cors.allowedHeaders);

  if (env.cors.allowCredentials) {
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

const corsMiddleware = (request, response, next) => {
  const requestOrigin = request.headers.origin;
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);

  if (allowedOrigin) {
    applyCorsHeaders(response, allowedOrigin);
  }

  if (request.method === 'OPTIONS') {
    if (!requestOrigin) {
      response.status(NO_CONTENT_STATUS).end();
      return;
    }

    if (!allowedOrigin) {
      logger.warn({ origin: requestOrigin }, 'Blocked CORS preflight request');
      response.status(403).json({
        message: 'CORS origin is not allowed'
      });
      return;
    }

    response.status(NO_CONTENT_STATUS).end();
    return;
  }

  next();
};

module.exports = { corsMiddleware };
