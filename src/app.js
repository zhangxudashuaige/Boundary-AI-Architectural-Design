const express = require('express');
const pinoHttp = require('pino-http');

const { logger } = require('./config/logger');
const { ensureUploadsDirectory, uploadsDirectory } = require('./config/storage');
const routes = require('./routes');
const { notFoundHandler } = require('./middlewares/notFound.middleware');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

ensureUploadsDirectory();

app.use(
  pinoHttp({
    logger,
    autoLogging: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDirectory));

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
