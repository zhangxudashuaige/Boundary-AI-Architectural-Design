import { apiRoutes } from "@/config/api";

function normalizeRenderTaskResponse(payload) {
  return payload?.data?.task || payload?.task || payload?.data || null;
}

export async function getRenderTask(taskId, signal) {
  const response = await fetch(`${apiRoutes.render}/${taskId}`, {
    method: "GET",
    cache: "no-store",
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: "状态查询服务返回了无法解析的响应。" }));

  if (!response.ok) {
    const error = new Error(payload.message || "查询渲染任务状态失败，请稍后重试。");
    error.status = response.status;
    throw error;
  }

  const task = normalizeRenderTaskResponse(payload);

  if (!task?.id) {
    throw new Error("状态查询成功，但未返回有效的任务信息。");
  }

  return task;
}
