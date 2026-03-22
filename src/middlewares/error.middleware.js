const { env } = require('../config/env');

const errorHandler = (error, req, res, next) => {
  req.log.error({ err: error }, 'Request failed');

  const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
  const statusCode = isFileTooLarge ? 400 : error.statusCode || 500;
  const isOperational = statusCode < 500;
  const message = isFileTooLarge
    ? 'File size must not exceed 10MB'
    : isOperational
      ? error.message
      : 'Internal Server Error';

  res.status(statusCode).json({
    message,
    ...(env.nodeEnv !== 'production' && !isOperational
      ? { details: error.message }
      : {})
  });
};

module.exports = { errorHandler };
