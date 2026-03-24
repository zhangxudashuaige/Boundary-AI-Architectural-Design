const { logger } = require('../../config/logger');
const { env } = require('../../config/env');
const { generateImage } = require('../../services/ai-image.service');
const { downloadImage } = require('../../services/image-download.service');
const { editImage } = require('../../services/image-edit.service');
const {
  extractGeometryConstraint,
  isGeometryAnalysisEnabled,
  normalizeGeometryConstraint
} = require('../../services/geometry-constraint.service');
const { AppError } = require('../../utils/AppError');
const { buildRenderEditPrompt } = require('./render-prompt-composer');
const {
  RENDER_TASK_STATUS,
  TASK_STAGE_STATUS,
  createRenderTask,
  deleteRenderTaskById,
  getRenderTaskById,
  listRenderTasks,
  updateAnalysisTaskStatus,
  updateRenderTask,
  updateRenderTaskStatus
} = require('./render-task.repository');

const normalizeNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const getTaskRawPrompt = (task) =>
  normalizeNonEmptyString(task.rawPrompt) ||
  normalizeNonEmptyString(task.renderPrompt) ||
  '';

const getTaskSourceImageUrl = (task) =>
  normalizeNonEmptyString(task.inputImageUrl) ||
  normalizeNonEmptyString(task.inputFileUrl) ||
  null;

const getTaskGeometryConstraint = (task) => {
  const geometryConstraint = task?.analysisResult?.geometryConstraint;

  if (!geometryConstraint || typeof geometryConstraint !== 'object') {
    return null;
  }

  const normalizedGeometryConstraint =
    normalizeGeometryConstraint(geometryConstraint);

  return normalizedGeometryConstraint.summary ||
    normalizedGeometryConstraint.massing.length ||
    normalizedGeometryConstraint.topology.length ||
    normalizedGeometryConstraint.shapeLanguage.length ||
    normalizedGeometryConstraint.camera.length ||
    normalizedGeometryConstraint.forbidden.length
    ? normalizedGeometryConstraint
    : null;
};

const resolvePreferredTaskPrompt = async (task) => {
  const rawPrompt = getTaskRawPrompt(task);
  const renderPrompt =
    normalizeNonEmptyString(task.renderPrompt) || rawPrompt;
  const refinedPrompt = renderPrompt !== rawPrompt ? renderPrompt : null;
  const prompt = renderPrompt;
  const geometryConstraint = getTaskGeometryConstraint(task);
  const hasSourceImage = Boolean(getTaskSourceImageUrl(task));

  return {
    rawPrompt,
    refinedPrompt,
    renderPrompt,
    prompt,
    geometryConstraint,
    hasSourceImage,
    editPrompt: buildRenderEditPrompt({
      userPrompt: renderPrompt,
      rawPrompt,
      appearancePrompt: refinedPrompt,
      geometryConstraint,
      hasSourceImage
    })
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

const resolveSerializedPromptBundle = (task) => {
  const rawPrompt =
    normalizeNonEmptyString(task.rawPrompt) ||
    normalizeNonEmptyString(task.renderPrompt) ||
    '';
  const renderPrompt =
    normalizeNonEmptyString(task.renderPrompt) || rawPrompt;
  const optimizedPrompt =
    normalizeNonEmptyString(task.optimizedPrompt) || renderPrompt;
  const promptSource = renderPrompt !== rawPrompt ? 'refinedPrompt' : 'rawPrompt';
  const geometryConstraint = getTaskGeometryConstraint(task);
  const hasSourceImage = Boolean(getTaskSourceImageUrl(task));

  return {
    rawPrompt,
    renderPrompt,
    optimizedPrompt,
    promptSource,
    geometryConstraint,
    editPrompt: buildRenderEditPrompt({
      userPrompt: renderPrompt,
      rawPrompt,
      appearancePrompt: renderPrompt !== rawPrompt ? renderPrompt : null,
      geometryConstraint,
      hasSourceImage
    })
  };
};

const serializeRenderTask = (task) => ({
  ...resolveSerializedPromptBundle(task),
  id: task.id,
  imageUrl: task.inputImageUrl || task.inputFileUrl,
  inputFileUrl: task.inputFileUrl,
  inputFileType: task.inputFileType,
  prompt: task.rawPrompt || task.renderPrompt,
  analysisRequest: task.analysisRequest,
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

const resolveTaskWithGeometryAnalysis = async (task) => {
  if (!isGeometryAnalysisEnabled()) {
    return task;
  }

  if (getTaskGeometryConstraint(task)) {
    return task;
  }

  const imageUrl = getTaskSourceImageUrl(task);

  if (!normalizeNonEmptyString(imageUrl)) {
    return task;
  }

  let nextTask = task;

  if (task.analysisStatus !== TASK_STAGE_STATUS.PROCESSING) {
    nextTask =
      (await updateAnalysisTaskStatus(task.id, TASK_STAGE_STATUS.PROCESSING)) ||
      nextTask;
  }

  const analysisResult = await extractGeometryConstraint({ imageUrl });

  if (!analysisResult?.geometryConstraint) {
    return (
      (await updateAnalysisTaskStatus(task.id, TASK_STAGE_STATUS.SKIPPED, {
        analysisResult: null
      })) || nextTask
    );
  }

  return (
    (await updateAnalysisTaskStatus(task.id, TASK_STAGE_STATUS.COMPLETED, {
      analysisResult
    })) || {
      ...nextTask,
      analysisStatus: TASK_STAGE_STATUS.COMPLETED,
      analysisResult
    }
  );
};

const runRenderPipeline = async (task) => {
  let activeTask = task;
  const imageUrl = getTaskSourceImageUrl(task);
  let renderResult = null;

  try {
    activeTask = await resolveTaskWithGeometryAnalysis(task);

    const {
      rawPrompt,
      refinedPrompt,
      renderPrompt,
      prompt,
      editPrompt,
      geometryConstraint,
      hasSourceImage
    } = await resolvePreferredTaskPrompt(activeTask);

    logger.info(
      {
        taskId: activeTask.id,
        provider: env.ai.provider,
        model: env.ai.imageModel,
        imageUrl,
        renderMode: hasSourceImage ? 'image-edit' : 'text-to-image',
        promptSource: refinedPrompt ? 'refinedPrompt' : 'rawPrompt',
        editPromptLength: editPrompt.length
      },
      'Render task started'
    );

    const processingTask = await updateRenderTaskStatus(
      activeTask.id,
      RENDER_TASK_STATUS.PROCESSING,
      {
        optimizedPrompt: prompt,
        errorMessage: null
      }
    );

    if (!processingTask) {
      logger.warn({ taskId: activeTask.id }, 'Render task not found before processing');
      return;
    }

    logger.info(
      {
        taskId: activeTask.id,
        promptSource: refinedPrompt ? 'refinedPrompt' : 'rawPrompt',
        renderMode: hasSourceImage ? 'image-edit' : 'text-to-image',
        rawPrompt,
        renderPrompt,
        optimizedPrompt: prompt,
        geometryConstraint,
        editPrompt
      },
      'Resolved render image edit prompt'
    );

    logger.info(
      {
        taskId: activeTask.id,
        provider: env.ai.provider,
        model: env.ai.imageModel,
        imageUrl,
        renderMode: hasSourceImage ? 'image-edit' : 'text-to-image',
        promptSource: refinedPrompt ? 'refinedPrompt' : 'rawPrompt',
        editPromptLength: editPrompt.length
      },
      hasSourceImage
        ? 'Starting image edit render pipeline'
        : 'Starting text-to-image render pipeline'
    );

    renderResult = hasSourceImage
      ? await editImage({
          imageUrl,
          prompt: editPrompt
        })
      : await generateImage({
          prompt: editPrompt
        });

    if (!renderResult.success || !renderResult.outputImageUrl) {
      throw new Error(
        renderResult.errorMessage ||
          (hasSourceImage ? 'Image edit render failed' : 'Text-to-image render failed')
      );
    }

    const completedTask = await updateRenderTaskStatus(
      activeTask.id,
      RENDER_TASK_STATUS.COMPLETED,
      {
        optimizedPrompt: prompt,
        resultImageUrl: renderResult.outputImageUrl,
        errorMessage: null
      }
    );

    if (!completedTask) {
      logger.warn({ taskId: activeTask.id }, 'Render task not found before completion');
      return;
    }

    logger.info(
      {
        taskId: activeTask.id,
        provider: renderResult.provider || env.ai.provider,
        model: renderResult.model || env.ai.imageModel,
        strategy: renderResult.strategy || null,
        outputImageUrl: summarizeOutputImageUrlForLog(renderResult.outputImageUrl)
      },
      hasSourceImage
        ? 'Image edit render succeeded'
        : 'Text-to-image render succeeded'
    );
  } catch (error) {
    const { prompt } = await resolvePreferredTaskPrompt(activeTask);

    logger.error(
      {
        err: error,
        taskId: activeTask.id,
        imageUrl,
        rawPrompt: getTaskRawPrompt(activeTask),
        ...summarizeImageEditFailure(renderResult)
      },
      imageUrl ? 'Image edit render failed' : 'Text-to-image render failed'
    );

    await markRenderTaskFailed(activeTask.id, {
      optimizedPrompt: prompt,
      errorMessage: error.message
    });
  }
};

const createRenderJob = async ({ imageUrl, prompt, rawPrompt, refinedPrompt }) => {
  assertRequiredString(prompt, 'prompt');
  const normalizedImageUrl = normalizeNonEmptyString(imageUrl);
  const normalizedRawPrompt =
    normalizeNonEmptyString(rawPrompt) || prompt.trim();
  const normalizedRenderPrompt = prompt.trim();
  const normalizedRefinedPrompt = normalizeNonEmptyString(refinedPrompt);
  const optimizedPrompt = normalizedRenderPrompt;
  const hasSourceImage = Boolean(normalizedImageUrl);

  const task = await createRenderTask({
    inputFileUrl: normalizedImageUrl,
    inputFileType: hasSourceImage ? 'image' : 'text',
    inputImageUrl: normalizedImageUrl,
    renderPrompt: normalizedRenderPrompt,
    rawPrompt: normalizedRawPrompt,
    analysisRequest: hasSourceImage && isGeometryAnalysisEnabled()
      ? `geometry-constraint:${env.ai.geometryModel}`
      : null,
    optimizedPrompt,
    analysisStatus: hasSourceImage && isGeometryAnalysisEnabled()
      ? TASK_STAGE_STATUS.PENDING
      : TASK_STAGE_STATUS.SKIPPED,
    renderStatus: TASK_STAGE_STATUS.PENDING,
    status: RENDER_TASK_STATUS.PENDING
  });

  logger.info(
    {
      taskId: task.id,
      provider: env.ai.provider,
      model: env.ai.imageModel,
      imageUrl: task.inputFileUrl,
      renderMode: hasSourceImage ? 'image-edit' : 'text-to-image',
      promptSource:
        normalizedRefinedPrompt || optimizedPrompt !== normalizedRawPrompt
          ? 'refinedPrompt'
          : 'rawPrompt'
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
