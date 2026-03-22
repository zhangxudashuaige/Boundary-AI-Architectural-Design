const { AppError } = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

module.exports = { notFoundHandler };
