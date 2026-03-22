const express = require('express');

const {
  createRenderTask,
  getRenderTask
} = require('./render.controller');

const router = express.Router();

router.post('/', createRenderTask);
router.get('/:taskId', getRenderTask);

module.exports = router;
