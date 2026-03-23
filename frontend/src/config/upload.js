export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_LABEL = "10MB";
export const ACCEPTED_UPLOAD_TYPES = "image/png,image/jpeg,image/jpg,image/webp";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatFileMeta(file) {
  return `${file.type || "image/*"} / ${formatFileSize(file.size)}`;
}

export function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      message:
        "\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u56fe\u7247\u3002"
    };
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const hasValidType =
    ALLOWED_MIME_TYPES.has(file.type) && ALLOWED_EXTENSIONS.has(extension);

  if (!hasValidType) {
    return {
      valid: false,
      message:
        "\u4ec5\u652f\u6301 JPG\u3001JPEG\u3001PNG\u3001WEBP \u56fe\u7247\u3002"
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return {
      valid: false,
      message: `\u6587\u4ef6\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc7 ${MAX_UPLOAD_FILE_SIZE_LABEL}\u3002`
    };
  }

  return {
    valid: true,
    message: ""
  };
}
