const RENDER_TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const TASK_STAGE_STATUS = {
  ...RENDER_TASK_STATUS,
  SKIPPED: 'skipped'
};

const RENDER_TASK_STATUS_VALUES = Object.values(RENDER_TASK_STATUS);
const TASK_STAGE_STATUS_VALUES = Object.values(TASK_STAGE_STATUS);

const deriveOverallTaskStatus = ({ analysisStatus, renderStatus }) => {
  if (
    analysisStatus === TASK_STAGE_STATUS.FAILED ||
    renderStatus === TASK_STAGE_STATUS.FAILED
  ) {
    return RENDER_TASK_STATUS.FAILED;
  }

  if (
    analysisStatus === TASK_STAGE_STATUS.PROCESSING ||
    renderStatus === TASK_STAGE_STATUS.PROCESSING
  ) {
    return RENDER_TASK_STATUS.PROCESSING;
  }

  if (
    renderStatus === TASK_STAGE_STATUS.COMPLETED &&
    [
      TASK_STAGE_STATUS.COMPLETED,
      TASK_STAGE_STATUS.SKIPPED,
      null,
      undefined
    ].includes(analysisStatus)
  ) {
    return RENDER_TASK_STATUS.COMPLETED;
  }

  if (
    analysisStatus === TASK_STAGE_STATUS.COMPLETED &&
    renderStatus === TASK_STAGE_STATUS.PENDING
  ) {
    return RENDER_TASK_STATUS.PROCESSING;
  }

  return RENDER_TASK_STATUS.PENDING;
};

module.exports = {
  RENDER_TASK_STATUS,
  TASK_STAGE_STATUS,
  RENDER_TASK_STATUS_VALUES,
  TASK_STAGE_STATUS_VALUES,
  deriveOverallTaskStatus
};
