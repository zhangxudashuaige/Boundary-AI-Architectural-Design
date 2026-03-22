const { logger } = require('../../config/logger');
const { env } = require('../../config/env');
const { generateImage } = require('../../services/ai-image.service');
const { AppError } = require('../../utils/AppError');
const {
  RENDER_TASK_STATUS,
  TASK_STAGE_STATUS,
  createRenderTask,
  getRenderTaskById,
  updateRenderTaskStatus
} = require('./render-task.repository');

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const buildOptimizedPrompt = (prompt) =>
  [
    prompt.trim(),
    'high detail',
    'photorealistic architectural rendering',
    'refined materials',
    'cinematic lighting'
  ].join(', ');

const buildMockResultImageUrl = (taskId) =>
  `https://mock-render.local/results/render-task-${taskId}.webp`;

const getTaskPrompt = (task) => task.renderPrompt || task.rawPrompt || '';

const summarizeGenerationFailure = (generationResult) => ({
  model: generationResult?.model || env.ai.imageModel,
  responseStatus: generationResult?.responseStatus || null,
  errorMessage: generationResult?.errorMessage || null
});

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

const assertRequiredString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldName} is required`, 400);
  }
};

// Mock rendering remains available only as an explicit fallback for tests
// or when AI_PROVIDER=MOCK is intentionally configured.
const runMockRenderPipeline = async (task) => {
  const optimizedPrompt = buildOptimizedPrompt(getTaskPrompt(task));

  try {
    const processingTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.PROCESSING,
      {
        optimizedPrompt,
        errorMessage: null
      }
    );

    if (!processingTask) {
      logger.warn({ taskId: task.id }, 'Render task not found before processing');
      return;
    }

    await sleep(env.mockRenderDelayMs);

    const completedTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.COMPLETED,
      {
        optimizedPrompt,
        resultImageUrl: buildMockResultImageUrl(task.id),
        errorMessage: null
      }
    );

    if (!completedTask) {
      logger.warn({ taskId: task.id }, 'Render task not found before completion');
    }
  } catch (error) {
    logger.error({ err: error, taskId: task.id }, 'Mock render pipeline failed');

    try {
      await updateRenderTaskStatus(task.id, RENDER_TASK_STATUS.FAILED, {
        optimizedPrompt,
        errorMessage: error.message
      });
    } catch (updateError) {
      logger.error(
        { err: updateError, taskId: task.id },
        'Failed to mark render task as failed'
      );
    }
  }
};

const run302AiRenderPipeline = async (task) => {
  const optimizedPrompt = buildOptimizedPrompt(getTaskPrompt(task));
  let generationResult = null;

  try {
    const processingTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.PROCESSING,
      {
        optimizedPrompt,
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
        model: env.ai.imageModel
      },
      'Starting 302.AI image generation'
    );

    generationResult = await generateImage({
      prompt: optimizedPrompt
    });

    if (!generationResult.success || !generationResult.outputImageUrl) {
      throw new Error(
        generationResult.errorMessage || '302.AI image generation failed'
      );
    }

    const completedTask = await updateRenderTaskStatus(
      task.id,
      RENDER_TASK_STATUS.COMPLETED,
      {
        optimizedPrompt,
        resultImageUrl: generationResult.outputImageUrl,
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
        provider: env.ai.provider,
        model: generationResult.model || env.ai.imageModel,
        outputImageUrl: summarizeOutputImageUrlForLog(
          generationResult.outputImageUrl
        )
      },
      '302.AI image generation succeeded'
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        taskId: task.id,
        provider: env.ai.provider,
        ...summarizeGenerationFailure(generationResult)
      },
      '302.AI image generation failed'
    );

    try {
      await updateRenderTaskStatus(task.id, RENDER_TASK_STATUS.FAILED, {
        optimizedPrompt,
        errorMessage: error.message
      });
    } catch (updateError) {
      logger.error(
        { err: updateError, taskId: task.id },
        'Failed to mark render task as failed'
      );
    }
  }
};

const runRenderPipeline = async (task) => {
  if (env.ai.provider === 'MOCK') {
    return runMockRenderPipeline(task);
  }

  // All non-mock runtime traffic should use the real 302.AI pipeline.
  return run302AiRenderPipeline(task);
};

const createRenderJob = async ({ imageUrl, prompt }) => {
  assertRequiredString(imageUrl, 'imageUrl');
  assertRequiredString(prompt, 'prompt');

  const task = await createRenderTask({
    inputFileUrl: imageUrl.trim(),
    inputFileType: 'image',
    inputImageUrl: imageUrl.trim(),
    renderPrompt: prompt.trim(),
    rawPrompt: prompt.trim(),
    analysisStatus: TASK_STAGE_STATUS.SKIPPED,
    renderStatus: TASK_STAGE_STATUS.PENDING,
    status: RENDER_TASK_STATUS.PENDING
  });

  logger.info(
    {
      taskId: task.id,
      provider: env.ai.provider,
      model: env.ai.imageModel,
      imageUrl: task.inputFileUrl
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

module.exports = {
  createRenderJob,
  getRenderJobById,
  serializeRenderTask
};
