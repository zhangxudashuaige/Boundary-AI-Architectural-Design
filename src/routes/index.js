const express = require('express');

const healthRouter = require('./health.routes');
const renderRouter = require('../modules/render-tasks/render.routes');
const uploadRouter = require('../modules/uploads/upload.routes');

const router = express.Router();

router.use('/health', healthRouter);
router.use('/api/render', renderRouter);
router.use('/api/upload', uploadRouter);

module.exports = router;
