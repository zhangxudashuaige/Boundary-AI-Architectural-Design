const path = require('path');

const { AppError } = require('../../utils/AppError');

const uploadImage = (req, res, next) => {
  if (!req.file) {
    next(new AppError('Image file is required', 400));
    return;
  }

  const fileName = req.file.filename;
  const filePath = path.posix.join('uploads', fileName);
  const url = `${req.protocol}://${req.get('host')}/${filePath}`;

  res.status(201).json({
    fileName,
    filePath,
    url
  });
};

module.exports = { uploadImage };
