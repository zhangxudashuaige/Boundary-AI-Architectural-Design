import { apiRoutes } from "@/config/api";

const DOWNLOAD_FAILED = "下载渲染结果失败，请稍后重试。";

function parseFileNameFromDisposition(disposition) {
  if (typeof disposition !== "string" || disposition.trim() === "") {
    return "";
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"/i);

  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return "";
}

export async function downloadRenderResult(taskId, signal) {
  const response = await fetch(`${apiRoutes.render}/${taskId}/download`, {
    method: "GET",
    signal
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ message: DOWNLOAD_FAILED }));

    throw new Error(payload.message || DOWNLOAD_FAILED);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileName =
    parseFileNameFromDisposition(contentDisposition) ||
    `render-result-${taskId}.png`;

  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}
