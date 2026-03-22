const { Pool } = require('pg');

const { env } = require('./env');
const { logger } = require('./logger');

const pool = new Pool({
  ...(env.database.connectionString
    ? { connectionString: env.database.connectionString }
    : {
        host: env.database.host,
        port: env.database.port,
        database: env.database.name,
        user: env.database.user,
        password: env.database.password
      }),
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
  max: env.database.maxPoolSize,
  idleTimeoutMillis: env.database.idleTimeoutMs,
  connectionTimeoutMillis: env.database.connectionTimeoutMs
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});

const query = (text, params) => pool.query(text, params);

const checkDatabaseConnection = async () => {
  const startedAt = Date.now();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT NOW() AS server_time, current_database() AS database_name'
    );

    return {
      connected: true,
      database: result.rows[0].database_name,
      serverTime: result.rows[0].server_time,
      latencyMs: Date.now() - startedAt
    };
  } finally {
    client.release();
  }
};

const closeDatabasePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  checkDatabaseConnection,
  closeDatabasePool
};
