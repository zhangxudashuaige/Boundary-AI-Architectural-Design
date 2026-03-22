import { apiRoutes } from "@/config/api";

function normalizeUploadResponse(payload, fallbackFileName) {
  const imageUrl = payload.imageUrl || payload.fileUrl || payload.url || "";
  const fileUrl = payload.fileUrl || payload.imageUrl || payload.url || imageUrl;

  return {
    imageUrl,
    fileUrl,
    fileName: payload.fileName || fallbackFileName,
    filePath: payload.filePath || ""
  };
}

export async function uploadImage(file, signal) {
  const formData = new FormData();
  formData.set("image", file, file.name);

  const response = await fetch(apiRoutes.upload, {
    method: "POST",
    body: formData,
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: "上传服务返回了无法解析的响应。" }));

  if (!response.ok) {
    throw new Error(payload.message || "图片上传失败，请稍后重试。");
  }

  const result = normalizeUploadResponse(payload, file.name);

  if (!result.imageUrl && !result.fileUrl) {
    throw new Error("上传成功，但未返回可用的图片地址。");
  }

  return result;
}
