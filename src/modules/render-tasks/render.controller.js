const {
  createRenderJob,
  getRenderJobById,
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

module.exports = {
  createRenderTask,
  getRenderTask
};
