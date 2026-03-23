import { apiRoutes } from "@/config/api";

const INVALID_STATUS_RESPONSE =
  "\u72b6\u6001\u67e5\u8be2\u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6cd5\u89e3\u6790\u7684\u54cd\u5e94\u3002";
const GET_TASK_FAILED =
  "\u67e5\u8be2\u6e32\u67d3\u4efb\u52a1\u72b6\u6001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const INVALID_TASK_INFO =
  "\u72b6\u6001\u67e5\u8be2\u6210\u529f\uff0c\u4f46\u672a\u8fd4\u56de\u6709\u6548\u7684\u4efb\u52a1\u4fe1\u606f\u3002";

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
    .catch(() => ({ message: INVALID_STATUS_RESPONSE }));

  if (!response.ok) {
    const error = new Error(payload.message || GET_TASK_FAILED);
    error.status = response.status;
    throw error;
  }

  const task = normalizeRenderTaskResponse(payload);

  if (!task?.id) {
    throw new Error(INVALID_TASK_INFO);
  }

  return task;
}
