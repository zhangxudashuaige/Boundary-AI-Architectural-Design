const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { uploadsDirectory } = require('../config/storage');
const { downloadImage } = require('./image-download.service');

// Determine the extension from the image bytes, never from an upstream filename.
const getImageExtension = (buffer) => {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return '.png';
  if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return '.jpg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return '.gif';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return '.webp';
  if (buffer.subarray(0, 2).toString() === 'BM') return '.bmp';
  throw new Error('Generated image download did not contain a supported image');
};

const persistGeneratedImage = async ({ imageUrl, taskId, fileNamePrefix, storageRoot = uploadsDirectory }) => {
  if (!Number.isSafeInteger(taskId) || taskId <= 0) throw new Error('Invalid generated image task ID');
  if (!['render-result', 'inspiration-result'].includes(fileNamePrefix)) throw new Error('Invalid generated image category');

  const { buffer } = await downloadImage({ imageUrl, taskId, fileNamePrefix });
  if (!buffer.length || buffer.length > 64 * 1024 * 1024) throw new Error('Generated image must be between 1 byte and 64 MB');
  const extension = getImageExtension(buffer);
  const fileName = `${fileNamePrefix}-${taskId}-${randomUUID()}${extension}`;
  const directory = path.join(storageRoot, 'generated');
  const filePath = path.join(directory, fileName);
  const temporaryPath = `${filePath}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporaryPath, buffer, { flag: 'wx' });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => {});
    throw error;
  }

  // A same-origin path keeps production previews on the site's HTTPS connection.
  return `/uploads/generated/${fileName}`;
};

module.exports = { persistGeneratedImage };
