import { apiRoutes } from "@/config/api";

const INVALID_UPLOAD_RESPONSE =
  "\u4e0a\u4f20\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6cd5\u89e3\u6790\u7684\u54cd\u5e94\u3002";
const UPLOAD_FAILED =
  "\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const MISSING_UPLOAD_URL =
  "\u4e0a\u4f20\u6210\u529f\uff0c\u4f46\u672a\u8fd4\u56de\u53ef\u7528\u7684\u56fe\u7247\u5730\u5740\u3002";

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
    .catch(() => ({ message: INVALID_UPLOAD_RESPONSE }));

  if (!response.ok) {
    throw new Error(payload.message || UPLOAD_FAILED);
  }

  const result = normalizeUploadResponse(payload, file.name);

  if (!result.imageUrl && !result.fileUrl) {
    throw new Error(MISSING_UPLOAD_URL);
  }

  return result;
}
