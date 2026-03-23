import { apiRoutes } from "@/config/api";

const INVALID_STATUS_RESPONSE = "状态查询服务返回了无法解析的响应。";
const GET_TASK_FAILED = "查询灵感任务状态失败，请稍后重试。";
const INVALID_TASK_INFO = "状态查询成功，但未返回有效的任务信息。";

function normalizeInspirationTaskResponse(payload) {
  return payload?.data?.task || payload?.task || payload?.data || null;
}

export async function getInspirationTask(taskId, signal) {
  const response = await fetch(`${apiRoutes.inspiration}/${taskId}`, {
    method: "GET",
    cache: "no-store",
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: INVALID_STATUS_RESPONSE }));

  if (!response.ok) {
    const error = new Error(payload.message || GET_TASK_FAILED);
    error.status = response.status;
    throw error;
  }

  const task = normalizeInspirationTaskResponse(payload);

  if (!task?.id) {
    throw new Error(INVALID_TASK_INFO);
  }

  return task;
}
