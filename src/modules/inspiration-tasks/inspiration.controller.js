const {
  createInspirationJob,
  deleteInspirationJobById,
  getInspirationJobById,
  listInspirationJobs,
  downloadInspirationJobResult,
  serializeInspirationTask
} = require('./inspiration.service');

const createInspirationTask = async (req, res, next) => {
  try {
    const task = await createInspirationJob(req.body);

    res.status(201).json({
      success: true,
      data: {
        task: serializeInspirationTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getInspirationTask = async (req, res, next) => {
  try {
    const task = await getInspirationJobById(req.params.taskId);

    res.status(200).json({
      success: true,
      data: {
        task: serializeInspirationTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

const listInspirationTaskHistory = async (req, res, next) => {
  try {
    const tasks = await listInspirationJobs(req.query);

    res.status(200).json({
      success: true,
      data: {
        tasks: tasks.map(serializeInspirationTask),
        pagination: {
          limit: req.query.limit ? Number.parseInt(req.query.limit, 10) : undefined,
          offset: req.query.offset ? Number.parseInt(req.query.offset, 10) : undefined,
          count: tasks.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const downloadInspirationTaskResult = async (req, res, next) => {
  try {
    const downloadResult = await downloadInspirationJobResult(req.params.taskId);

    res.setHeader('Content-Type', downloadResult.contentType);
    res.setHeader('Content-Length', String(downloadResult.buffer.length));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadResult.fileName}"`
    );
    res.setHeader('Cache-Control', 'no-store');

    res.status(200).send(downloadResult.buffer);
  } catch (error) {
    next(error);
  }
};

const deleteInspirationTask = async (req, res, next) => {
  try {
    const task = await deleteInspirationJobById(req.params.taskId);

    res.status(200).json({
      success: true,
      data: {
        task: serializeInspirationTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInspirationTask,
  deleteInspirationTask,
  getInspirationTask,
  listInspirationTaskHistory,
  downloadInspirationTaskResult
};
