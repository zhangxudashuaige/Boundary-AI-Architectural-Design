const { app } = require('./app');
const { env } = require('./config/env');
const { logger } = require('./config/logger');
const {
  checkDatabaseConnection,
  closeDatabasePool
} = require('./config/database');

const server = app.listen(env.port, async () => {
  logger.info({ port: env.port }, 'Server started');

  try {
    const dbHealth = await checkDatabaseConnection();

    logger.info(
      {
        database: dbHealth.database,
        latencyMs: dbHealth.latencyMs
      },
      'Database connection verified'
    );
  } catch (error) {
    logger.warn({ err: error }, 'Database connection check failed on startup');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.fatal(
      { err: error, port: env.port },
      'Server failed to start because the port is already in use'
    );
  } else if (error.code === 'EACCES') {
    logger.fatal(
      { err: error, port: env.port },
      'Server failed to start because the port is not accessible'
    );
  } else {
    logger.fatal({ err: error, port: env.port }, 'Server failed to start');
  }

  process.exit(1);
});

const shutdown = (signal) => {
  logger.info({ signal }, 'Shutting down server');

  server.close(async () => {
    try {
      await closeDatabasePool();
      logger.info('Database pool closed');
      logger.info('HTTP server closed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error while closing server resources');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'Unhandled promise rejection');
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
