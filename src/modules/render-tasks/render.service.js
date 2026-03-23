const { logger } = require('../../config/logger');
const { env } = require('../../config/env');
const { downloadImage } = require('../../services/image-download.service');
const { editImage } = require('../../services/image-edit.service');
const { refinePrompt } = require('../../services/prompt-refine.service');
const { AppError } = require('../../utils/AppError');
const {
  RENDER_TASK_STATUS,
  TASK_STAGE_STATUS,
  createRenderTask,
  deleteRenderTaskById,
  getRenderTaskById,
  listRenderTasks,
  updateRenderTask,
  updateRenderTaskStatus
} = require('./render-task.repository');

const normalizeNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const buildOptimizedPrompt = async (prompt) => {
  try {
    const refineResult = await refinePrompt(prompt);
    return normalizeNonEmptyString(refineResult.refinedPrompt);
  } catch (error) {
    logger.warn(
      { err: error },
      'Prompt refinement failed, falling back to raw prompt'
    );

    return null;
  }
};

const getTaskRawPrompt = (task) =>
  normalizeNonEmptyString(task.rawPrompt) ||
  normalizeNonEmptyString(task.renderPrompt) ||
  '';

const resolvePreferredTaskPrompt = async (task) => {
  const rawPrompt = getTaskRawPrompt(task);
  const refinedPrompt =
    normalizeNonEmptyString(task.optimizedPrompt) ||
    (await buildOptimizedPrompt(rawPrompt));

  return {
    rawPrompt,
    refinedPrompt,
    prompt: refinedPrompt || rawPrompt
  };
};

const summarizeImageEditFailure = (editResult) => ({
  provider: editResult?.provider || env.ai.provider,
  model: editResult?.model || env.ai.imageModel,
  strategy: editResult?.strategy || null,
  errorMessage: editResult?.errorMessage || null
});

const markRenderTaskFailed = async (taskId, { optimizedPrompt, errorMessage }) => {
  try {
    const failedTask = await updateRenderTaskStatus(taskId, RENDER_TASK_STATUS.FAILED, {
      optimizedPrompt,
      errorMessage
    });

    if (failedTask) {
      return failedTask;
    }
  } catch (error) {
    logger.error(
      {
        err: error,
        taskId,
        errorMessage
      },
      'Failed to update render task status through status transition helper'
    );
  }

  try {
    return await updateRenderTask(taskId, {
      status: RENDER_TASK_STATUS.FAILED,
      renderStatus: RENDER_TASK_STATUS.FAILED,
      optimizedPrompt,
      errorMessage
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        taskId,
        errorMessage
      },
      'Failed to force render task into failed state'
    );

    return null;
  }
};

const summarizeOutputImageUrlForLog = (value) => {
  if (typeof value !== 'string' || value === '') {
    return value;
  }

  if (value.startsWith('data:image/')) {
    const mimeType = value.slice(5, value.indexOf(';')) || 'image';
    return `[data-url ${mimeType}, length=${value.length}]`;
  }

  return value;
};

const serializeRenderTask = (task) => ({
  id: task.id,
  imageUrl: task.inputImageUrl || task.inputFileUrl,
  inputFileUrl: task.inputFileUrl,
  inputFileType: task.inputFileType,
  prompt: task.rawPrompt || task.renderPrompt,
  analysisRequest: task.analysisRequest,
  renderPrompt: task.renderPrompt,
  optimizedPrompt: task.optimizedPrompt,
  status: task.status,
  analysisStatus: task.analysisStatus,
  renderStatus: task.renderStatus,
  analysisResult: task.analysisResult,
  resultImageUrl: task.resultImageUrl,
  errorMessage: task.errorMessage,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

const parsePositiveInteger = (value, fieldName, { min = 0, fallback } = {}) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new AppError(`${fieldName} must be an integer greater than or equal to ${min}`, 400);
  }

  return parsed;
};

const assertRequiredString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldName} is required`, 400);
  }
};

const runRenderPipeline = async (task) => {
  const imageUrl = task.inputImageUrl || task.inputFileUrl;
  const { rawPrompt, refinedPrompt, prompt } = await resolvePreferredTaskPrompt(task);
  let editResult = null;

  try {
    logger.info(
      {
        taskId: task.id,
        provider: env.ai.provider,
        model: env.ai.imageModel,
        imageUrl,
        promptSource: refinedPrompt ? 'refinedPrompt' : 'rawPrompt'
      },
      'Render task started'
    );

    const processingTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.PROCESSING,
      {
        optimizedPrompt: prompt,
        errorMessage: null
      }
    );

    if (!processingTask) {
      logger.warn({ taskId: task.id }, 'Render task not found before processing');
      return;
    }

    logger.info(
      {
        taskId: task.id,
        provider: env.ai.provider,
        model: env.ai.imageModel,
        imageUrl,
        promptSource: refinedPrompt ? 'refinedPrompt' : 'rawPrompt'
      },
      'Starting image edit render pipeline'
    );

    editResult = await editImage({
      imageUrl,
      prompt
    });

    if (!editResult.success || !editResult.outputImageUrl) {
      throw new Error(editResult.errorMessage || 'Image edit render failed');
    }

    const completedTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.COMPLETED,
      {
        optimizedPrompt: prompt,
        resultImageUrl: editResult.outputImageUrl,
        errorMessage: null
      }
    );

    if (!completedTask) {
      logger.warn({ taskId: task.id }, 'Render task not found before completion');
      return;
    }

    logger.info(
      {
        taskId: task.id,
        provider: editResult.provider || env.ai.provider,
        model: editResult.model || env.ai.imageModel,
        strategy: editResult.strategy || null,
        outputImageUrl: summarizeOutputImageUrlForLog(editResult.outputImageUrl)
      },
      'Image edit render succeeded'
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        taskId: task.id,
        imageUrl,
        rawPrompt,
        ...summarizeImageEditFailure(editResult)
      },
      'Image edit render failed'
    );

    await markRenderTaskFailed(task.id, {
      optimizedPrompt: prompt,
      errorMessage: error.message
    });
  }
};

const createRenderJob = async ({ imageUrl, prompt }) => {
  assertRequiredString(imageUrl, 'imageUrl');
  assertRequiredString(prompt, 'prompt');
  const rawPrompt = prompt.trim();
  const optimizedPrompt = (await buildOptimizedPrompt(rawPrompt)) || rawPrompt;

  const task = await createRenderTask({
    inputFileUrl: imageUrl.trim(),
    inputFileType: 'image',
    inputImageUrl: imageUrl.trim(),
    renderPrompt: rawPrompt,
    rawPrompt,
    optimizedPrompt,
    analysisStatus: TASK_STAGE_STATUS.SKIPPED,
    renderStatus: TASK_STAGE_STATUS.PENDING,
    status: RENDER_TASK_STATUS.PENDING
  });

  logger.info(
    {
      taskId: task.id,
      provider: env.ai.provider,
      model: env.ai.imageModel,
      imageUrl: task.inputFileUrl,
      promptSource: optimizedPrompt !== rawPrompt ? 'refinedPrompt' : 'rawPrompt'
    },
    'Render task created'
  );

  void runRenderPipeline(task);

  return task;
};

const getRenderJobById = async (taskId) => {
  const numericTaskId = Number.parseInt(taskId, 10);

  if (!Number.isInteger(numericTaskId) || numericTaskId <= 0) {
    throw new AppError('taskId must be a positive integer', 400);
  }

  const task = await getRenderTaskById(numericTaskId);

  if (!task) {
    throw new AppError('Render task not found', 404);
  }

  return task;
};

const listRenderJobs = async (query = {}) => {
  const status = normalizeNonEmptyString(query.status) || undefined;
  const analysisStatus =
    normalizeNonEmptyString(query.analysisStatus) || undefined;
  const renderStatus =
    normalizeNonEmptyString(query.renderStatus) || undefined;
  const limit = parsePositiveInteger(query.limit, 'limit', {
    min: 1,
    fallback: undefined
  });
  const offset = parsePositiveInteger(query.offset, 'offset', {
    min: 0,
    fallback: undefined
  });

  try {
    return await listRenderTasks({
      status,
      analysisStatus,
      renderStatus,
      limit,
      offset
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

const resolveDownloadTarget = (task) => {
  const resultImageUrl = normalizeNonEmptyString(task.resultImageUrl);

  if (!resultImageUrl) {
    return null;
  }

  if (
    resultImageUrl.includes('mock-render.local') &&
    normalizeNonEmptyString(task.inputFileUrl)
  ) {
    return task.inputFileUrl;
  }

  return resultImageUrl;
};

const downloadRenderJobResult = async (taskId) => {
  const task = await getRenderJobById(taskId);
  const downloadTarget = resolveDownloadTarget(task);

  if (!downloadTarget) {
    throw new AppError('Render result image is not available yet', 409);
  }

  try {
    return await downloadImage({
      imageUrl: downloadTarget,
      taskId: task.id,
      fileNamePrefix: 'render-result'
    });
  } catch (error) {
    throw new AppError(
      `Failed to download render result image: ${error.message}`,
      502
    );
  }
};

const deleteRenderJobById = async (taskId) => {
  const task = await getRenderJobById(taskId);

  if (
    task.status === RENDER_TASK_STATUS.PENDING ||
    task.status === RENDER_TASK_STATUS.PROCESSING
  ) {
    throw new AppError(
      'Render task is still running and cannot be deleted yet',
      409
    );
  }

  const deletedTask = await deleteRenderTaskById(task.id);

  if (!deletedTask) {
    throw new AppError('Render task not found', 404);
  }

  logger.info(
    {
      taskId: deletedTask.id,
      status: deletedTask.status
    },
    'Render task deleted'
  );

  return deletedTask;
};

module.exports = {
  createRenderJob,
  deleteRenderJobById,
  getRenderJobById,
  listRenderJobs,
  downloadRenderJobResult,
  serializeRenderTask
};
