const dotenv = require('dotenv');

dotenv.config();

const SUPPORTED_AI_PROVIDERS = ['MOCK', '302AI'];

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toPositiveNumber = (value, fallback) => {
  const parsed = toNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

const toStringList = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toBoolean = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toUrl = (value, fallback, fieldName) => {
  const candidate = normalizeString(value) || fallback;

  try {
    const parsed = new URL(candidate);
    return parsed.toString().replace(/\/$/, '');
  } catch (error) {
    throw new Error(`${fieldName} must be a valid absolute URL`);
  }
};

const normalizeAiProvider = (value) => {
  const normalized = normalizeString(value).toUpperCase() || '302AI';

  if (!SUPPORTED_AI_PROVIDERS.includes(normalized)) {
    throw new Error(
      `AI_PROVIDER must be one of: ${SUPPORTED_AI_PROVIDERS.join(', ')}`
    );
  }

  return normalized;
};

const normalizeAiApiKey = (value, provider) => {
  const normalized = normalizeString(value);

  if (provider !== '302AI') {
    return normalized;
  }

  if (!normalized) {
    throw new Error('AI_API_KEY is required when AI_PROVIDER=302AI');
  }

  if (!/^Bearer\s+\S+$/i.test(normalized)) {
    throw new Error(
      'AI_API_KEY must use the format: Bearer <302AI_API_KEY>'
    );
  }

  return normalized;
};

const DEFAULT_DEV_CORS_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const normalizeCorsAllowedOrigins = (value, nodeEnv) => {
  const items = toStringList(value);

  if (items.includes('*')) {
    return ['*'];
  }

  if (items.length > 0) {
    return items.map((origin) => {
      try {
        return new URL(origin).toString().replace(/\/$/, '');
      } catch (error) {
        throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid URL: ${origin}`);
      }
    });
  }

  if (nodeEnv === 'production') {
    return [];
  }

  return DEFAULT_DEV_CORS_ALLOWED_ORIGINS;
};

const parseDatabaseUrl = (value) => {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  let parsed = null;

  try {
    parsed = new URL(normalized);
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid absolute PostgreSQL URL');
  }

  const sslMode = normalizeString(parsed.searchParams.get('sslmode')).toLowerCase();
  const ssl = parsed.searchParams.has('ssl')
    ? toBoolean(parsed.searchParams.get('ssl'), false)
    : sslMode !== '' && !['disable', 'allow'].includes(sslMode);

  return {
    connectionString: normalized,
    host: parsed.hostname,
    port: toNumber(parsed.port, 5432),
    name: parsed.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl
  };
};

const databaseUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL);
const nodeEnv = process.env.NODE_ENV || 'development';
const aiProvider = normalizeAiProvider(process.env.AI_PROVIDER);
const aiApiKey = normalizeAiApiKey(process.env.AI_API_KEY, aiProvider);

const env = {
  nodeEnv,
  port: toNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  mockRenderDelayMs: toPositiveNumber(process.env.MOCK_RENDER_DELAY_MS, 5000),
  cors: {
    allowedOrigins: normalizeCorsAllowedOrigins(
      process.env.CORS_ALLOWED_ORIGINS,
      nodeEnv
    ),
    allowCredentials: toBoolean(process.env.CORS_ALLOW_CREDENTIALS, false),
    allowedMethods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      normalizeString(process.env.CORS_ALLOWED_HEADERS) ||
      'Content-Type, Authorization'
  },
  ai: {
    provider: aiProvider,
    baseUrl: toUrl(
      process.env.AI_BASE_URL,
      'https://api.302.ai',
      'AI_BASE_URL'
    ),
    apiKey: aiApiKey,
    imageModel:
      normalizeString(process.env.IMAGE_MODEL) ||
      'flux-2-max',
    promptModel:
      normalizeString(process.env.PROMPT_MODEL) ||
      'qwen3.5-27b',
    requestTimeoutMs: toPositiveNumber(process.env.AI_REQUEST_TIMEOUT_MS, 30_000),
    promptRequestTimeoutMs: toPositiveNumber(
      process.env.PROMPT_REQUEST_TIMEOUT_MS,
      60_000
    ),
    pollIntervalMs: toPositiveNumber(process.env.AI_POLL_INTERVAL_MS, 3_000),
    pollAttempts: toPositiveNumber(process.env.AI_POLL_ATTEMPTS, 20)
  },
  database: {
    connectionString: databaseUrlConfig?.connectionString || null,
    host: process.env.DB_HOST || databaseUrlConfig?.host || 'localhost',
    port: toNumber(process.env.DB_PORT, databaseUrlConfig?.port || 5432),
    name: process.env.DB_NAME || databaseUrlConfig?.name || 'ai_arch_render',
    user: process.env.DB_USER || databaseUrlConfig?.user || 'postgres',
    password:
      process.env.DB_PASSWORD || databaseUrlConfig?.password || 'postgres',
    ssl: toBoolean(process.env.DB_SSL, databaseUrlConfig?.ssl || false),
    maxPoolSize: toNumber(process.env.DB_MAX_POOL_SIZE, 10),
    idleTimeoutMs: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 10000),
    connectionTimeoutMs: toNumber(
      process.env.DB_CONNECTION_TIMEOUT_MS,
      5000
    )
  }
};

module.exports = { env };
