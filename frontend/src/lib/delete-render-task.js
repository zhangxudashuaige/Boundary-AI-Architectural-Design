import { apiRoutes } from "@/config/api";

const DELETE_RENDER_TASK_FAILED = "删除历史记录失败，请稍后重试。";

export async function deleteRenderTask(taskId, signal) {
  const response = await fetch(`${apiRoutes.render}/${taskId}`, {
    method: "DELETE",
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: DELETE_RENDER_TASK_FAILED }));

  if (!response.ok) {
    throw new Error(payload.message || DELETE_RENDER_TASK_FAILED);
  }

  return payload?.data?.task || payload?.task || payload?.data || null;
}
