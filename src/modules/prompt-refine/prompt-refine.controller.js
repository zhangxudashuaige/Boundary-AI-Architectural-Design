const { refineRawPrompt } = require('./prompt-refine.service');

const refinePrompt = async (req, res, next) => {
  try {
    const result = await refineRawPrompt(req.body || {});

    res.status(200).json({
      success: true,
      rawPrompt: result.rawPrompt,
      refinedPrompt: result.refinedPrompt,
      strategy: result.strategy,
      attributes: result.attributes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  refinePrompt
};
