import { apiRoutes } from "@/config/api";

const DELETE_TASK_FAILED = "删除历史记录失败，请稍后重试。";

export async function deleteInspirationTask(taskId, signal) {
  const response = await fetch(`${apiRoutes.inspiration}/${taskId}`, {
    method: "DELETE",
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: DELETE_TASK_FAILED }));

  if (!response.ok) {
    throw new Error(payload.message || DELETE_TASK_FAILED);
  }

  return payload?.data?.task || payload?.task || payload?.data || null;
}
