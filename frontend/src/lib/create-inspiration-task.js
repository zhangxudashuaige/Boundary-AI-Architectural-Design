import { apiRoutes } from "@/config/api";

const INVALID_INSPIRATION_RESPONSE = "灵感生成服务返回了无法解析的响应。";
const CREATE_TASK_FAILED = "创建灵感任务失败，请稍后重试。";
const INVALID_TASK_ID = "灵感任务已创建，但未返回有效的 taskId。";

function normalizeInspirationTaskResponse(payload) {
  return payload?.data?.task || payload?.task || payload?.data || null;
}

function normalizePromptValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildInspirationTaskRequest(input) {
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

export async function createInspirationTask(input, signal) {
  const request = buildInspirationTaskRequest(input);

  const response = await fetch(apiRoutes.inspiration, {
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
    .catch(() => ({ message: INVALID_INSPIRATION_RESPONSE }));

  if (!response.ok) {
    throw new Error(payload.message || CREATE_TASK_FAILED);
  }

  const task = normalizeInspirationTaskResponse(payload);

  if (!task?.id) {
    throw new Error(INVALID_TASK_ID);
  }

  return task;
}
