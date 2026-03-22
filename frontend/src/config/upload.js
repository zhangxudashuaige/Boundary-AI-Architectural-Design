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
  return `${file.type || "image/*"} · ${formatFileSize(file.size)}`;
}

export function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      message: "请选择要上传的图片。"
    };
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const hasValidType =
    ALLOWED_MIME_TYPES.has(file.type) && ALLOWED_EXTENSIONS.has(extension);

  if (!hasValidType) {
    return {
      valid: false,
      message: "仅支持 JPG、JPEG、PNG、WEBP 图片。"
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return {
      valid: false,
      message: `文件大小不能超过 ${MAX_UPLOAD_FILE_SIZE_LABEL}。`
    };
  }

  return {
    valid: true,
    message: ""
  };
}
