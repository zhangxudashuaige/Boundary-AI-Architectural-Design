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

const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp'
};

const DEFAULT_TIMEOUT_MS = 20_000;

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeMimeType = (value) =>
  normalizeString(value).split(';')[0].trim().toLowerCase();

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

const parseDataUrl = (value) => {
  const match = normalizeString(value).match(DATA_URL_PATTERN);

  if (!match?.groups?.mimeType || !match.groups.data) {
    return null;
  }

  return {
    mimeType: normalizeMimeType(match.groups.mimeType),
    buffer: Buffer.from(match.groups.data.replace(/\s+/g, ''), 'base64')
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

const resolveUploadsImageFile = async (imageUrl) => {
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
  const mimeType =
    MIME_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ||
    'application/octet-stream';

  return {
    buffer: await fs.readFile(filePath),
    mimeType,
    filePath
  };
};

const fetchRemoteImage = async (imageUrl) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);

  timeoutHandle.unref?.();

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Remote image download failed with status ${response.status}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType =
      normalizeMimeType(response.headers.get('content-type')) ||
      MIME_TYPE_BY_EXTENSION[path.extname(new URL(imageUrl).pathname).toLowerCase()] ||
      'application/octet-stream';

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `Remote image download timed out after ${DEFAULT_TIMEOUT_MS}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const sanitizeFileNameSegment = (value) =>
  normalizeString(value)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'render-result';

const getFileExtensionFromImageUrl = (imageUrl) => {
  const normalized = normalizeString(imageUrl);

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('data:image/')) {
    const dataUrl = parseDataUrl(normalized);
    return dataUrl ? EXTENSION_BY_MIME_TYPE[dataUrl.mimeType] || '' : '';
  }

  try {
    const pathname = isAbsoluteHttpUrl(normalized)
      ? new URL(normalized).pathname
      : normalized;

    return path.extname(pathname).toLowerCase();
  } catch (error) {
    return '';
  }
};

const buildDownloadFileName = ({
  imageUrl,
  taskId,
  fileNamePrefix = 'render-result',
  mimeType
}) => {
  const extension =
    EXTENSION_BY_MIME_TYPE[normalizeMimeType(mimeType)] ||
    getFileExtensionFromImageUrl(imageUrl) ||
    '.png';

  return `${sanitizeFileNameSegment(fileNamePrefix)}-${taskId}${extension}`;
};

const downloadImage = async ({
  imageUrl,
  taskId,
  fileNamePrefix = 'render-result'
}) => {
  const normalizedImageUrl = normalizeString(imageUrl);

  if (!normalizedImageUrl) {
    throw new Error('imageUrl is required for download');
  }

  const dataUrl = parseDataUrl(normalizedImageUrl);

  if (dataUrl) {
    return {
      buffer: dataUrl.buffer,
      contentType: dataUrl.mimeType,
      fileName: buildDownloadFileName({
        imageUrl: normalizedImageUrl,
        taskId,
        fileNamePrefix,
        mimeType: dataUrl.mimeType
      })
    };
  }

  const uploadsImage = await resolveUploadsImageFile(normalizedImageUrl);

  if (uploadsImage) {
    return {
      buffer: uploadsImage.buffer,
      contentType: uploadsImage.mimeType,
      fileName: buildDownloadFileName({
        imageUrl: uploadsImage.filePath,
        taskId,
        fileNamePrefix,
        mimeType: uploadsImage.mimeType
      })
    };
  }

  if (isAbsoluteHttpUrl(normalizedImageUrl)) {
    const remoteImage = await fetchRemoteImage(normalizedImageUrl);

    return {
      buffer: remoteImage.buffer,
      contentType: remoteImage.mimeType,
      fileName: buildDownloadFileName({
        imageUrl: normalizedImageUrl,
        taskId,
        fileNamePrefix,
        mimeType: remoteImage.mimeType
      })
    };
  }

  throw new Error('imageUrl must be an absolute URL, uploads path, or data URL');
};

module.exports = {
  downloadImage
};
