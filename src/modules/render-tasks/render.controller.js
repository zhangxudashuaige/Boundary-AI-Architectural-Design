const {
  createRenderJob,
  deleteRenderJobById,
  getRenderJobById,
  listRenderJobs,
  downloadRenderJobResult,
  serializeRenderTask
} = require('./render.service');

const createRenderTask = async (req, res, next) => {
  try {
    const task = await createRenderJob(req.body);

    res.status(201).json({
      success: true,
      data: {
        task: serializeRenderTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRenderTask = async (req, res, next) => {
  try {
    const task = await getRenderJobById(req.params.taskId);

    res.status(200).json({
      success: true,
      data: {
        task: serializeRenderTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

const listRenderTaskHistory = async (req, res, next) => {
  try {
    const tasks = await listRenderJobs(req.query);

    res.status(200).json({
      success: true,
      data: {
        tasks: tasks.map(serializeRenderTask),
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

const downloadRenderTaskResult = async (req, res, next) => {
  try {
    const downloadResult = await downloadRenderJobResult(req.params.taskId);

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

const deleteRenderTask = async (req, res, next) => {
  try {
    const task = await deleteRenderJobById(req.params.taskId);

    res.status(200).json({
      success: true,
      data: {
        task: serializeRenderTask(task)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRenderTask,
  deleteRenderTask,
  getRenderTask,
  listRenderTaskHistory,
  downloadRenderTaskResult
};
