const fs = require('fs/promises');
const path = require('path');

const { uploadsDirectory } = require('../config/storage');

const DATA_URL_PATTERN =
  /^data:(?<mimeType>[-\w.+/]+);base64,(?<data>[A-Za-z0-9+/=\r\n]+)$/i;

const MIME_TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
};

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

const parseDataUrl = (value) => {
  const match = normalizeString(value).match(DATA_URL_PATTERN);

  if (!match?.groups?.mimeType || !match.groups.data) {
    return null;
  }

  return {
    type: 'inlineData',
    inlineData: {
      mimeType: match.groups.mimeType,
      data: match.groups.data.replace(/\s+/g, '')
    }
  };
};

const normalizeUploadsRelativePath = (value) => {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith('uploads/')) {
    return null;
  }

  return normalized.slice('uploads/'.length);
};

const resolveUploadsFilePath = (relativePath) => {
  const absolutePath = path.resolve(uploadsDirectory, relativePath);
  const uploadsRootWithSeparator = `${uploadsDirectory}${path.sep}`;

  if (
    absolutePath !== uploadsDirectory &&
    !absolutePath.startsWith(uploadsRootWithSeparator)
  ) {
    throw new Error('Resolved upload file path is outside the uploads directory');
  }

  return absolutePath;
};

const getMimeTypeFromFilePath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPE_BY_EXTENSION[extension] || null;
};

const loadInlineImageFromFile = async (filePath) => {
  const mimeType = getMimeTypeFromFilePath(filePath);

  if (!mimeType) {
    throw new Error(
      `Unsupported uploaded image type for model input: ${path.extname(filePath)}`
    );
  }

  const fileBuffer = await fs.readFile(filePath);

  return {
    type: 'inlineData',
    inlineData: {
      mimeType,
      data: fileBuffer.toString('base64')
    }
  };
};

const resolveInlineImageFromUploadsPath = async (imageUrl) => {
  const normalized = normalizeString(imageUrl);

  if (!normalized) {
    return null;
  }

  let uploadsRelativePath = null;

  if (isAbsoluteHttpUrl(normalized)) {
    let parsedUrl;

    try {
      parsedUrl = new URL(normalized);
    } catch (error) {
      throw new Error('imageUrl must be a valid absolute URL');
    }

    uploadsRelativePath = normalizeUploadsRelativePath(
      decodeURIComponent(parsedUrl.pathname)
    );
  } else {
    uploadsRelativePath = normalizeUploadsRelativePath(
      decodeURIComponent(normalized)
    );
  }

  if (!uploadsRelativePath) {
    return null;
  }

  const filePath = resolveUploadsFilePath(uploadsRelativePath);
  return loadInlineImageFromFile(filePath);
};

const resolveSourceImageInput = async (imageUrl) => {
  const normalized = normalizeString(imageUrl);

  if (!normalized) {
    return null;
  }

  const dataUrlInput = parseDataUrl(normalized);

  if (dataUrlInput) {
    return dataUrlInput;
  }

  const uploadsInput = await resolveInlineImageFromUploadsPath(normalized);

  if (uploadsInput) {
    return uploadsInput;
  }

  if (isAbsoluteHttpUrl(normalized)) {
    return {
      type: 'image_url',
      imageUrl: normalized
    };
  }

  throw new Error('imageUrl must be an absolute URL, uploads path, or data URL');
};

module.exports = {
  resolveSourceImageInput
};
