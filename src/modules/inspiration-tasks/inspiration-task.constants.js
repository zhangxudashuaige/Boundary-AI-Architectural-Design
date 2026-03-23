const INSPIRATION_TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const TASK_STAGE_STATUS = {
  ...INSPIRATION_TASK_STATUS,
  SKIPPED: 'skipped'
};

const INSPIRATION_TASK_STATUS_VALUES = Object.values(INSPIRATION_TASK_STATUS);
const TASK_STAGE_STATUS_VALUES = Object.values(TASK_STAGE_STATUS);

const deriveOverallTaskStatus = ({ analysisStatus, generationStatus }) => {
  if (
    analysisStatus === TASK_STAGE_STATUS.FAILED ||
    generationStatus === TASK_STAGE_STATUS.FAILED
  ) {
    return INSPIRATION_TASK_STATUS.FAILED;
  }

  if (
    analysisStatus === TASK_STAGE_STATUS.PROCESSING ||
    generationStatus === TASK_STAGE_STATUS.PROCESSING
  ) {
    return INSPIRATION_TASK_STATUS.PROCESSING;
  }

  if (
    generationStatus === TASK_STAGE_STATUS.COMPLETED &&
    [
      TASK_STAGE_STATUS.COMPLETED,
      TASK_STAGE_STATUS.SKIPPED,
      null,
      undefined
    ].includes(analysisStatus)
  ) {
    return INSPIRATION_TASK_STATUS.COMPLETED;
  }

  if (
    analysisStatus === TASK_STAGE_STATUS.COMPLETED &&
    generationStatus === TASK_STAGE_STATUS.PENDING
  ) {
    return INSPIRATION_TASK_STATUS.PROCESSING;
  }

  return INSPIRATION_TASK_STATUS.PENDING;
};

module.exports = {
  INSPIRATION_TASK_STATUS,
  TASK_STAGE_STATUS,
  INSPIRATION_TASK_STATUS_VALUES,
  TASK_STAGE_STATUS_VALUES,
  deriveOverallTaskStatus
};
