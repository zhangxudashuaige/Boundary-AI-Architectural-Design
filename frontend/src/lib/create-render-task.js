import { apiRoutes } from "@/config/api";

function normalizeRenderTaskResponse(payload) {
  return payload?.data?.task || payload?.task || payload?.data || null;
}

export async function createRenderTask({ imageUrl, prompt }, signal) {
  const response = await fetch(apiRoutes.render, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageUrl,
      prompt
    }),
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: "渲染服务返回了无法解析的响应。" }));

  if (!response.ok) {
    throw new Error(payload.message || "创建渲染任务失败，请稍后重试。");
  }

  const task = normalizeRenderTaskResponse(payload);

  if (!task?.id) {
    throw new Error("渲染任务已创建，但未返回有效的 taskId。");
  }

  return task;
}
