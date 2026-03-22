const path = require('path');
const fs = require('fs');

const uploadsDirectory = path.resolve(__dirname, '..', '..', 'uploads');

const ensureUploadsDirectory = () => {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
};

module.exports = {
  uploadsDirectory,
  ensureUploadsDirectory
};
