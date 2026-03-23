const { query } = require('../../config/database');

const {
  INSPIRATION_TASK_STATUS,
  INSPIRATION_TASK_STATUS_VALUES,
  TASK_STAGE_STATUS,
  TASK_STAGE_STATUS_VALUES,
  deriveOverallTaskStatus
} = require('./inspiration-task.constants');

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const baseSelectColumns = `
  id,
  input_image_url,
  input_file_url,
  input_file_type,
  raw_prompt,
  inspiration_prompt,
  analysis_request,
  optimized_prompt,
  status,
  analysis_status,
  generation_status,
  analysis_result,
  result_image_url,
  error_message,
  created_at,
  updated_at
`;

const mapInspirationTask = (row) => {
  if (!row) {
    return null;
  }

  const inputFileUrl = row.input_file_url || row.input_image_url;
  const inspirationPrompt = row.inspiration_prompt || row.raw_prompt;

  return {
    id: Number(row.id),
    inputImageUrl: row.input_image_url || inputFileUrl,
    inputFileUrl,
    inputFileType: row.input_file_type,
    rawPrompt: row.raw_prompt || inspirationPrompt,
    inspirationPrompt,
    analysisRequest: row.analysis_request,
    optimizedPrompt: row.optimized_prompt,
    status: row.status,
    analysisStatus: row.analysis_status,
    generationStatus: row.generation_status,
    analysisResult: row.analysis_result,
    resultImageUrl: row.result_image_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const assertNonEmptyString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
};

const normalizeOptionalString = (value, fieldName) => {
  if (value === null) {
    return null;
  }

  assertNonEmptyString(value, fieldName);
  return value.trim();
};

const normalizeFileType = (value) => {
  assertNonEmptyString(value, 'inputFileType');
  return value.trim().toLowerCase();
};

const normalizeAnalysisResult = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return { summary: trimmed };
    }
  }

  if (typeof value === 'object' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  throw new Error('analysisResult must be valid JSON-like data');
};

const assertValidStatus = (status) => {
  if (!INSPIRATION_TASK_STATUS_VALUES.includes(status)) {
    throw new Error(
      `status must be one of: ${INSPIRATION_TASK_STATUS_VALUES.join(', ')}`
    );
  }
};

const assertValidStageStatus = (status, fieldName) => {
  if (!TASK_STAGE_STATUS_VALUES.includes(status)) {
    throw new Error(
      `${fieldName} must be one of: ${TASK_STAGE_STATUS_VALUES.join(', ')}`
    );
  }
};

const normalizeListLimit = (limit = DEFAULT_LIST_LIMIT) => {
  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(limit, MAX_LIST_LIMIT);
};

const normalizeOffset = (offset = 0) => {
  if (!Number.isInteger(offset) || offset < 0) {
    return 0;
  }

  return offset;
};

const resolveCreatePayload = ({
  inputImageUrl,
  inputFileUrl,
  inputFileType = 'image',
  rawPrompt,
  inspirationPrompt,
  analysisRequest = null,
  optimizedPrompt = null,
  status,
  analysisStatus,
  generationStatus = TASK_STAGE_STATUS.PENDING,
  analysisResult = null,
  resultImageUrl = null,
  errorMessage = null
}) => {
  const normalizedInputFileUrl = normalizeOptionalString(
    inputFileUrl ?? inputImageUrl,
    'inputFileUrl'
  );
  const normalizedFileType = normalizeFileType(inputFileType);
  const normalizedInspirationPrompt = normalizeOptionalString(
    inspirationPrompt ?? rawPrompt,
    'inspirationPrompt'
  );
  const normalizedRawPrompt =
    rawPrompt === undefined
      ? normalizedInspirationPrompt
      : normalizeOptionalString(rawPrompt, 'rawPrompt');
  const normalizedAnalysisRequest =
    analysisRequest === null
      ? null
      : normalizeOptionalString(analysisRequest, 'analysisRequest');
  const normalizedOptimizedPrompt =
    optimizedPrompt === null
      ? null
      : normalizeOptionalString(optimizedPrompt, 'optimizedPrompt');
  const normalizedResultImageUrl =
    resultImageUrl === null
      ? null
      : normalizeOptionalString(resultImageUrl, 'resultImageUrl');
  const normalizedErrorMessage =
    errorMessage === null
      ? null
      : normalizeOptionalString(errorMessage, 'errorMessage');
  const normalizedAnalysisResult = normalizeAnalysisResult(analysisResult);
  const normalizedAnalysisStatus =
    analysisStatus ??
    (normalizedAnalysisRequest
      ? TASK_STAGE_STATUS.PENDING
      : TASK_STAGE_STATUS.SKIPPED);
  const normalizedGenerationStatus = generationStatus;
  const normalizedStatus =
    status ??
    deriveOverallTaskStatus({
      analysisStatus: normalizedAnalysisStatus,
      generationStatus: normalizedGenerationStatus
    });
  const normalizedInputImageUrl =
    inputImageUrl !== undefined
      ? inputImageUrl === null
        ? null
        : normalizeOptionalString(inputImageUrl, 'inputImageUrl')
      : normalizedFileType === 'image'
        ? normalizedInputFileUrl
        : null;

  assertValidStageStatus(normalizedAnalysisStatus, 'analysisStatus');
  assertValidStageStatus(normalizedGenerationStatus, 'generationStatus');
  assertValidStatus(normalizedStatus);

  return {
    inputImageUrl: normalizedInputImageUrl,
    inputFileUrl: normalizedInputFileUrl,
    inputFileType: normalizedFileType,
    rawPrompt: normalizedRawPrompt,
    inspirationPrompt: normalizedInspirationPrompt,
    analysisRequest: normalizedAnalysisRequest,
    optimizedPrompt: normalizedOptimizedPrompt,
    status: normalizedStatus,
    analysisStatus: normalizedAnalysisStatus,
    generationStatus: normalizedGenerationStatus,
    analysisResult: normalizedAnalysisResult,
    resultImageUrl: normalizedResultImageUrl,
    errorMessage: normalizedErrorMessage
  };
};

const createInspirationTask = async (payload) => {
  const normalizedTask = resolveCreatePayload(payload);

  const result = await query(
    `
      INSERT INTO inspiration_tasks (
        input_image_url,
        input_file_url,
        input_file_type,
        raw_prompt,
        inspiration_prompt,
        analysis_request,
        optimized_prompt,
        status,
        analysis_status,
        generation_status,
        analysis_result,
        result_image_url,
        error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        ${baseSelectColumns}
    `,
    [
      normalizedTask.inputImageUrl,
      normalizedTask.inputFileUrl,
      normalizedTask.inputFileType,
      normalizedTask.rawPrompt,
      normalizedTask.inspirationPrompt,
      normalizedTask.analysisRequest,
      normalizedTask.optimizedPrompt,
      normalizedTask.status,
      normalizedTask.analysisStatus,
      normalizedTask.generationStatus,
      normalizedTask.analysisResult,
      normalizedTask.resultImageUrl,
      normalizedTask.errorMessage
    ]
  );

  return mapInspirationTask(result.rows[0]);
};

const getInspirationTaskById = async (id) => {
  const result = await query(
    `
      SELECT
        ${baseSelectColumns}
      FROM inspiration_tasks
      WHERE id = $1
    `,
    [id]
  );

  return mapInspirationTask(result.rows[0]);
};

const deleteInspirationTaskById = async (id) => {
  const result = await query(
    `
      DELETE FROM inspiration_tasks
      WHERE id = $1
      RETURNING
        ${baseSelectColumns}
    `,
    [id]
  );

  return mapInspirationTask(result.rows[0]);
};

const listInspirationTasks = async ({
  status,
  analysisStatus,
  generationStatus,
  limit = DEFAULT_LIST_LIMIT,
  offset = 0
} = {}) => {
  const normalizedLimit = normalizeListLimit(limit);
  const normalizedOffset = normalizeOffset(offset);

  if (status !== undefined) {
    assertValidStatus(status);
  }

  if (analysisStatus !== undefined) {
    assertValidStageStatus(analysisStatus, 'analysisStatus');
  }

  if (generationStatus !== undefined) {
    assertValidStageStatus(generationStatus, 'generationStatus');
  }

  const filters = [];
  const params = [];

  if (status !== undefined) {
    params.push(status);
    filters.push(`status = $${params.length}`);
  }

  if (analysisStatus !== undefined) {
    params.push(analysisStatus);
    filters.push(`analysis_status = $${params.length}`);
  }

  if (generationStatus !== undefined) {
    params.push(generationStatus);
    filters.push(`generation_status = $${params.length}`);
  }

  params.push(normalizedLimit);
  const limitParam = `$${params.length}`;

  params.push(normalizedOffset);
  const offsetParam = `$${params.length}`;

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT
        ${baseSelectColumns}
      FROM inspiration_tasks
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    params
  );

  return result.rows.map(mapInspirationTask);
};

const updateInspirationTask = async (id, updates) => {
  const nextUpdates = { ...(updates || {}) };

  if (nextUpdates.inputFileUrl !== undefined && nextUpdates.inputImageUrl === undefined) {
    const nextFileType = nextUpdates.inputFileType;

    if (nextFileType === undefined || String(nextFileType).trim().toLowerCase() === 'image') {
      nextUpdates.inputImageUrl = nextUpdates.inputFileUrl;
    }
  }

  if (nextUpdates.inputImageUrl !== undefined && nextUpdates.inputFileUrl === undefined) {
    nextUpdates.inputFileUrl = nextUpdates.inputImageUrl;
  }

  const fieldMap = {
    inputImageUrl: 'input_image_url',
    inputFileUrl: 'input_file_url',
    inputFileType: 'input_file_type',
    rawPrompt: 'raw_prompt',
    inspirationPrompt: 'inspiration_prompt',
    analysisRequest: 'analysis_request',
    optimizedPrompt: 'optimized_prompt',
    status: 'status',
    analysisStatus: 'analysis_status',
    generationStatus: 'generation_status',
    analysisResult: 'analysis_result',
    resultImageUrl: 'result_image_url',
    errorMessage: 'error_message'
  };

  const entries = Object.entries(nextUpdates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    throw new Error('No fields provided to update inspiration task');
  }

  if (nextUpdates.inputImageUrl !== undefined) {
    if (nextUpdates.inputImageUrl === null) {
      throw new Error('inputImageUrl cannot be null');
    }

    nextUpdates.inputImageUrl = normalizeOptionalString(
      nextUpdates.inputImageUrl,
      'inputImageUrl'
    );
  }

  if (nextUpdates.inputFileUrl !== undefined) {
    if (nextUpdates.inputFileUrl === null) {
      throw new Error('inputFileUrl cannot be null');
    }

    nextUpdates.inputFileUrl = normalizeOptionalString(
      nextUpdates.inputFileUrl,
      'inputFileUrl'
    );
  }

  if (nextUpdates.inputFileType !== undefined) {
    nextUpdates.inputFileType = normalizeFileType(nextUpdates.inputFileType);
  }

  if (nextUpdates.rawPrompt !== undefined) {
    if (nextUpdates.rawPrompt === null) {
      throw new Error('rawPrompt cannot be null');
    }

    nextUpdates.rawPrompt = normalizeOptionalString(nextUpdates.rawPrompt, 'rawPrompt');
  }

  if (nextUpdates.inspirationPrompt !== undefined) {
    if (nextUpdates.inspirationPrompt === null) {
      throw new Error('inspirationPrompt cannot be null');
    }

    nextUpdates.inspirationPrompt = normalizeOptionalString(
      nextUpdates.inspirationPrompt,
      'inspirationPrompt'
    );
  }

  if (nextUpdates.analysisRequest !== undefined) {
    nextUpdates.analysisRequest =
      nextUpdates.analysisRequest === null
        ? null
        : normalizeOptionalString(nextUpdates.analysisRequest, 'analysisRequest');
  }

  if (nextUpdates.optimizedPrompt !== undefined) {
    nextUpdates.optimizedPrompt =
      nextUpdates.optimizedPrompt === null
        ? null
        : normalizeOptionalString(nextUpdates.optimizedPrompt, 'optimizedPrompt');
  }

  if (nextUpdates.status !== undefined) {
    assertValidStatus(nextUpdates.status);
  }

  if (nextUpdates.analysisStatus !== undefined) {
    assertValidStageStatus(nextUpdates.analysisStatus, 'analysisStatus');
  }

  if (nextUpdates.generationStatus !== undefined) {
    assertValidStageStatus(nextUpdates.generationStatus, 'generationStatus');
  }

  if (nextUpdates.analysisResult !== undefined) {
    nextUpdates.analysisResult = normalizeAnalysisResult(nextUpdates.analysisResult);
  }

  if (nextUpdates.resultImageUrl !== undefined) {
    nextUpdates.resultImageUrl =
      nextUpdates.resultImageUrl === null
        ? null
        : normalizeOptionalString(nextUpdates.resultImageUrl, 'resultImageUrl');
  }

  if (nextUpdates.errorMessage !== undefined) {
    nextUpdates.errorMessage =
      nextUpdates.errorMessage === null
        ? null
        : normalizeOptionalString(nextUpdates.errorMessage, 'errorMessage');
  }

  const setClauses = [];
  const params = [];

  Object.entries(nextUpdates)
    .filter(([, value]) => value !== undefined)
    .forEach(([key, value]) => {
      const columnName = fieldMap[key];

      if (!columnName) {
        throw new Error(`Unsupported inspiration task update field: ${key}`);
      }

      params.push(value);
      setClauses.push(`${columnName} = $${params.length}`);
    });

  params.push(id);

  const result = await query(
    `
      UPDATE inspiration_tasks
      SET ${setClauses.join(', ')}
      WHERE id = $${params.length}
      RETURNING
        ${baseSelectColumns}
    `,
    params
  );

  return mapInspirationTask(result.rows[0]);
};

const updateGenerationTaskStatus = async (
  id,
  status,
  { optimizedPrompt, resultImageUrl, errorMessage } = {}
) => {
  assertValidStatus(status);

  const existingTask = await getInspirationTaskById(id);

  if (!existingTask) {
    return null;
  }

  return updateInspirationTask(id, {
    status: deriveOverallTaskStatus({
      analysisStatus: existingTask.analysisStatus,
      generationStatus: status
    }),
    generationStatus: status,
    optimizedPrompt,
    resultImageUrl,
    errorMessage
  });
};

const updateAnalysisTaskStatus = async (
  id,
  status,
  { analysisResult, errorMessage } = {}
) => {
  assertValidStageStatus(status, 'analysisStatus');

  const existingTask = await getInspirationTaskById(id);

  if (!existingTask) {
    return null;
  }

  return updateInspirationTask(id, {
    status: deriveOverallTaskStatus({
      analysisStatus: status,
      generationStatus: existingTask.generationStatus
    }),
    analysisStatus: status,
    analysisResult,
    errorMessage
  });
};

module.exports = {
  INSPIRATION_TASK_STATUS,
  TASK_STAGE_STATUS,
  createInspirationTask,
  deleteInspirationTaskById,
  getInspirationTaskById,
  listInspirationTasks,
  updateInspirationTask,
  updateGenerationTaskStatus,
  updateAnalysisTaskStatus
};
