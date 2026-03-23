const { AppError } = require('../../utils/AppError');
const { refinePrompt } = require('../../services/prompt-refine.service');

const refineRawPrompt = async ({ rawPrompt }) => {
  if (typeof rawPrompt !== 'string' || rawPrompt.trim() === '') {
    throw new AppError('rawPrompt is required', 400);
  }

  return await refinePrompt(rawPrompt);
};

module.exports = {
  refineRawPrompt
};
