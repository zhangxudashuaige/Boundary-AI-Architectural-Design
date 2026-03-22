const path = require('path');
const crypto = require('crypto');

const multer = require('multer');

const { uploadsDirectory } = require('../../config/storage');
const { AppError } = require('../../utils/AppError');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const sanitizeFileBaseName = (fileName) => {
  const parsedName = path.parse(fileName).name;
  const sanitized = parsedName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'image';
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadsDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileBaseName(
      file.originalname
    )}${extension}`;

    callback(null, fileName);
  }
});

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedType =
    allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension);

  if (!isAllowedType) {
    callback(
      new AppError('Only jpg, jpeg, png and webp images are allowed', 400)
    );
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

module.exports = {
  uploadSingleImage: upload.single('image')
};
