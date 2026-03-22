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

const parseDatabaseUrl = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new URL(value);

  return {
    connectionString: value,
    host: parsed.hostname,
    port: toNumber(parsed.port, 5432),
    name: parsed.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: false
  };
};

const databaseUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL);
const aiProvider = normalizeAiProvider(process.env.AI_PROVIDER);
const aiApiKey = normalizeAiApiKey(process.env.AI_API_KEY, aiProvider);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  mockRenderDelayMs: toPositiveNumber(process.env.MOCK_RENDER_DELAY_MS, 5000),
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
      'gemini-2.5-flash-image',
    requestTimeoutMs: toPositiveNumber(process.env.AI_REQUEST_TIMEOUT_MS, 30_000),
    pollIntervalMs: toPositiveNumber(process.env.AI_POLL_INTERVAL_MS, 3_000),
    pollAttempts: toPositiveNumber(process.env.AI_POLL_ATTEMPTS, 20)
  },
  database: {
    connectionString: process.env.DATABASE_URL || null,
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
