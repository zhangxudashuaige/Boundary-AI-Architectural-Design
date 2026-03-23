const { logger } = require('../../config/logger');
const { env } = require('../../config/env');
const { downloadImage } = require('../../services/image-download.service');
const { editImage } = require('../../services/image-edit.service');
const { AppError } = require('../../utils/AppError');
const {
  INSPIRATION_TASK_STATUS,
  TASK_STAGE_STATUS,
  createInspirationTask,
  deleteInspirationTaskById,
  getInspirationTaskById,
  listInspirationTasks,
  updateInspirationTask,
  updateGenerationTaskStatus
} = require('./inspiration-task.repository');

const normalizeNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const getTaskRawPrompt = (task) =>
  normalizeNonEmptyString(task.rawPrompt) ||
  normalizeNonEmptyString(task.inspirationPrompt) ||
  '';

const resolvePreferredTaskPrompt = (task) => {
  const rawPrompt = getTaskRawPrompt(task);
  const inspirationPrompt = normalizeNonEmptyString(task.inspirationPrompt);
  const optimizedPrompt = normalizeNonEmptyString(task.optimizedPrompt);
  const refinedPrompt =
    optimizedPrompt && optimizedPrompt !== rawPrompt ? optimizedPrompt : null;

  return {
    rawPrompt,
    refinedPrompt,
    prompt: refinedPrompt || inspirationPrompt || rawPrompt
  };
};

const resolveIncomingInspirationPrompts = ({ prompt, rawPrompt, refinedPrompt }) => {
  const normalizedPrompt = normalizeNonEmptyString(prompt);
  const normalizedRawPrompt =
    normalizeNonEmptyString(rawPrompt) ||
    normalizedPrompt ||
    normalizeNonEmptyString(refinedPrompt);
  const candidateRefinedPrompt = normalizeNonEmptyString(refinedPrompt);
  const normalizedRefinedPrompt =
    candidateRefinedPrompt && candidateRefinedPrompt !== normalizedRawPrompt
      ? candidateRefinedPrompt
      : null;
  const effectivePrompt = normalizedRefinedPrompt || normalizedRawPrompt;

  if (!effectivePrompt) {
    throw new AppError('prompt is required', 400);
  }

  return {
    rawPrompt: normalizedRawPrompt || effectivePrompt,
    refinedPrompt: normalizedRefinedPrompt,
    prompt: effectivePrompt
  };
};

const summarizeImageEditFailure = (editResult) => ({
  provider: editResult?.provider || env.ai.provider,
  model: editResult?.model || env.ai.imageModel,
  strategy: editResult?.strategy || null,
  errorMessage: editResult?.errorMessage || null
});

const markInspirationTaskFailed = async (taskId, { errorMessage }) => {
  try {
    const failedTask = await updateGenerationTaskStatus(
      taskId,
      INSPIRATION_TASK_STATUS.FAILED,
      {
        errorMessage
      }
    );

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
      'Failed to update inspiration task status through status transition helper'
    );
  }

  try {
    return await updateInspirationTask(taskId, {
      status: INSPIRATION_TASK_STATUS.FAILED,
      generationStatus: INSPIRATION_TASK_STATUS.FAILED,
      errorMessage
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        taskId,
        errorMessage
      },
      'Failed to force inspiration task into failed state'
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

const serializeInspirationTask = (task) => ({
  id: task.id,
  imageUrl: task.inputImageUrl || task.inputFileUrl,
  inputFileUrl: task.inputFileUrl,
  inputFileType: task.inputFileType,
  prompt: task.rawPrompt || task.inspirationPrompt,
  rawPrompt: task.rawPrompt,
  analysisRequest: task.analysisRequest,
  inspirationPrompt: task.inspirationPrompt,
  optimizedPrompt: task.optimizedPrompt,
  status: task.status,
  analysisStatus: task.analysisStatus,
  generationStatus: task.generationStatus,
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

const runInspirationPipeline = async (task) => {
  const imageUrl = task.inputImageUrl || task.inputFileUrl;
  const { rawPrompt, refinedPrompt, prompt } = resolvePreferredTaskPrompt(task);
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
      'Inspiration task started'
    );

    const processingTask = await updateGenerationTaskStatus(
      task.id,
      INSPIRATION_TASK_STATUS.PROCESSING,
      {
        errorMessage: null
      }
    );

    if (!processingTask) {
      logger.warn({ taskId: task.id }, 'Inspiration task not found before processing');
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
      'Starting inspiration image generation pipeline'
    );

    editResult = await editImage({
      imageUrl,
      prompt
    });

    if (!editResult.success || !editResult.outputImageUrl) {
      throw new Error(editResult.errorMessage || 'Inspiration image generation failed');
    }

    const completedTask = await updateGenerationTaskStatus(
      task.id,
      INSPIRATION_TASK_STATUS.COMPLETED,
      {
        resultImageUrl: editResult.outputImageUrl,
        errorMessage: null
      }
    );

    if (!completedTask) {
      logger.warn({ taskId: task.id }, 'Inspiration task not found before completion');
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
      'Inspiration image generation succeeded'
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
      'Inspiration image generation failed'
    );

    await markInspirationTaskFailed(task.id, {
      errorMessage: error.message
    });
  }
};

const createInspirationJob = async ({ imageUrl, prompt, rawPrompt, refinedPrompt }) => {
  assertRequiredString(imageUrl, 'imageUrl');
  const resolvedPrompts = resolveIncomingInspirationPrompts({
    prompt,
    rawPrompt,
    refinedPrompt
  });

  const task = await createInspirationTask({
    inputFileUrl: imageUrl.trim(),
    inputFileType: 'image',
    inputImageUrl: imageUrl.trim(),
    rawPrompt: resolvedPrompts.rawPrompt,
    inspirationPrompt: resolvedPrompts.prompt,
    optimizedPrompt: resolvedPrompts.prompt,
    analysisStatus: TASK_STAGE_STATUS.SKIPPED,
    generationStatus: TASK_STAGE_STATUS.PENDING,
    status: INSPIRATION_TASK_STATUS.PENDING
  });

  logger.info(
    {
      taskId: task.id,
      provider: env.ai.provider,
      model: env.ai.imageModel,
      imageUrl: task.inputFileUrl,
      promptSource: resolvedPrompts.refinedPrompt ? 'refinedPrompt' : 'rawPrompt'
    },
    'Inspiration task created'
  );

  void runInspirationPipeline(task);

  return task;
};

const getInspirationJobById = async (taskId) => {
  const numericTaskId = Number.parseInt(taskId, 10);

  if (!Number.isInteger(numericTaskId) || numericTaskId <= 0) {
    throw new AppError('taskId must be a positive integer', 400);
  }

  const task = await getInspirationTaskById(numericTaskId);

  if (!task) {
    throw new AppError('Inspiration task not found', 404);
  }

  return task;
};

const listInspirationJobs = async (query = {}) => {
  const status = normalizeNonEmptyString(query.status) || undefined;
  const analysisStatus =
    normalizeNonEmptyString(query.analysisStatus) || undefined;
  const generationStatus =
    normalizeNonEmptyString(query.generationStatus) || undefined;
  const limit = parsePositiveInteger(query.limit, 'limit', {
    min: 1,
    fallback: undefined
  });
  const offset = parsePositiveInteger(query.offset, 'offset', {
    min: 0,
    fallback: undefined
  });

  try {
    return await listInspirationTasks({
      status,
      analysisStatus,
      generationStatus,
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
    resultImageUrl.includes('mock-image-edit.local') &&
    normalizeNonEmptyString(task.inputFileUrl)
  ) {
    return task.inputFileUrl;
  }

  return resultImageUrl;
};

const downloadInspirationJobResult = async (taskId) => {
  const task = await getInspirationJobById(taskId);
  const downloadTarget = resolveDownloadTarget(task);

  if (!downloadTarget) {
    throw new AppError('Inspiration result image is not available yet', 409);
  }

  try {
    return await downloadImage({
      imageUrl: downloadTarget,
      taskId: task.id,
      fileNamePrefix: 'inspiration-result'
    });
  } catch (error) {
    throw new AppError(
      `Failed to download inspiration result image: ${error.message}`,
      502
    );
  }
};

const deleteInspirationJobById = async (taskId) => {
  const task = await getInspirationJobById(taskId);

  if (
    task.status === INSPIRATION_TASK_STATUS.PENDING ||
    task.status === INSPIRATION_TASK_STATUS.PROCESSING
  ) {
    throw new AppError(
      'Inspiration task is still running and cannot be deleted yet',
      409
    );
  }

  const deletedTask = await deleteInspirationTaskById(task.id);

  if (!deletedTask) {
    throw new AppError('Inspiration task not found', 404);
  }

  logger.info(
    {
      taskId: deletedTask.id,
      status: deletedTask.status
    },
    'Inspiration task deleted'
  );

  return deletedTask;
};

module.exports = {
  createInspirationJob,
  deleteInspirationJobById,
  getInspirationJobById,
  listInspirationJobs,
  downloadInspirationJobResult,
  serializeInspirationTask
};
