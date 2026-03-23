const express = require('express');

const {
  createInspirationTask,
  deleteInspirationTask,
  getInspirationTask,
  listInspirationTaskHistory,
  downloadInspirationTaskResult
} = require('./inspiration.controller');

const router = express.Router();

router.post('/', createInspirationTask);
router.get('/', listInspirationTaskHistory);
router.get('/:taskId/download', downloadInspirationTaskResult);
router.get('/:taskId', getInspirationTask);
router.delete('/:taskId', deleteInspirationTask);

module.exports = router;
