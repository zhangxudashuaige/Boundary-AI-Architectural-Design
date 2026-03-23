export const INSPIRATION_WORKSPACE_STORAGE_KEY =
  "ai-arch-inspiration-workspace";
export const INSPIRATION_WORKSPACE_STORAGE_VERSION = 1;
export const INSPIRATION_TASK_POLL_INTERVAL_MS = 2000;

export const BACKEND_INSPIRATION_TASK_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed"
};

const TERMINAL_INSPIRATION_TASK_STATUS = new Set([
  BACKEND_INSPIRATION_TASK_STATUS.COMPLETED,
  BACKEND_INSPIRATION_TASK_STATUS.FAILED
]);

export function isTerminalInspirationTaskStatus(status) {
  return TERMINAL_INSPIRATION_TASK_STATUS.has(status);
}
