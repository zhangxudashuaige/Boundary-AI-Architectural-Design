export const HOME_WORKSPACE_STORAGE_KEY = "ai-arch-render-home-workspace";
export const HOME_WORKSPACE_STORAGE_VERSION = 1;
export const RENDER_TASK_POLL_INTERVAL_MS = 2000;

export const BACKEND_RENDER_TASK_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed"
};

const TERMINAL_RENDER_TASK_STATUS = new Set([
  BACKEND_RENDER_TASK_STATUS.COMPLETED,
  BACKEND_RENDER_TASK_STATUS.FAILED
]);

export function isTerminalRenderTaskStatus(status) {
  return TERMINAL_RENDER_TASK_STATUS.has(status);
}
