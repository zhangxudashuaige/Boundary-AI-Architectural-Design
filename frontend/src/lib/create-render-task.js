import { apiRoutes } from "@/config/api";

const INVALID_RENDER_RESPONSE = "渲染服务返回了无法解析的响应。";
const CREATE_TASK_FAILED = "创建渲染任务失败，请稍后重试。";
const INVALID_TASK_ID = "渲染任务已创建，但未返回有效的 taskId。";

function normalizeRenderTaskResponse(payload) {
  return payload?.data?.task || payload?.task || payload?.data || null;
}

function normalizePromptValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @typedef {"rawPrompt" | "refinedPrompt" | null} RenderPromptSource
 *
 * @typedef {Object} RenderTaskRequest
 * @property {string} imageUrl
 * @property {string} rawPrompt
 * @property {string} refinedPrompt
 * @property {string} prompt
 * @property {RenderPromptSource} promptSource
 */

/**
 * Build the frontend render request payload while keeping the current backend-compatible
 * `prompt` field as the effective value that should be used for rendering.
 *
 * @param {{ imageUrl?: string, rawPrompt?: string, refinedPrompt?: string }} input
 * @returns {RenderTaskRequest}
 */
export function buildRenderTaskRequest(input) {
  const imageUrl = typeof input?.imageUrl === "string" ? input.imageUrl.trim() : "";
  const rawPrompt = normalizePromptValue(input?.rawPrompt);
  const refinedPrompt = normalizePromptValue(input?.refinedPrompt);
  const prompt = refinedPrompt || rawPrompt;

  return {
    imageUrl,
    rawPrompt,
    refinedPrompt,
    prompt,
    promptSource: refinedPrompt ? "refinedPrompt" : rawPrompt ? "rawPrompt" : null
  };
}

export async function createRenderTask(input, signal) {
  const request = buildRenderTaskRequest(input);

  const response = await fetch(apiRoutes.render, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageUrl: request.imageUrl,
      rawPrompt: request.rawPrompt,
      refinedPrompt: request.refinedPrompt,
      prompt: request.prompt
    }),
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: INVALID_RENDER_RESPONSE }));

  if (!response.ok) {
    throw new Error(payload.message || CREATE_TASK_FAILED);
  }

  const task = normalizeRenderTaskResponse(payload);

  if (!task?.id) {
    throw new Error(INVALID_TASK_ID);
  }

  return task;
}
