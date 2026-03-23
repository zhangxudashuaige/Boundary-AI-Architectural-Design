const {
  resolveSourceImageInput
} = require('../../services/source-image-input.service');

const resolveTaskSourceImage = async (imageUrl) =>
  resolveSourceImageInput(imageUrl);

module.exports = {
  resolveTaskSourceImage
};
