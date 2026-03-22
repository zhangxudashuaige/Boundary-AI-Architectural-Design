const pino = require('pino');

const { env } = require('./env');

const transport =
  env.nodeEnv === 'production'
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      };

const logger = pino({
  level: env.logLevel,
  transport
});

module.exports = { logger };
