const express = require('express');

const {
  createRenderTask,
  deleteRenderTask,
  getRenderTask,
  listRenderTaskHistory,
  downloadRenderTaskResult
} = require('./render.controller');

const router = express.Router();

router.post('/', createRenderTask);
router.get('/', listRenderTaskHistory);
router.get('/:taskId/download', downloadRenderTaskResult);
router.get('/:taskId', getRenderTask);
router.delete('/:taskId', deleteRenderTask);

module.exports = router;
