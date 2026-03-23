import { apiRoutes } from "@/config/api";

const INVALID_REFINE_RESPONSE = "AI优化服务返回了无法解析的响应。";
const REFINE_PROMPT_FAILED = "AI优化失败，请稍后重试。";
const EMPTY_REFINED_PROMPT = "AI优化成功，但没有返回可用的优化描述。";

function normalizeRefineResponse(payload) {
  return {
    success: Boolean(payload?.success),
    rawPrompt: payload?.rawPrompt || payload?.data?.rawPrompt || "",
    refinedPrompt: payload?.refinedPrompt || payload?.data?.refinedPrompt || "",
    strategy: payload?.strategy || payload?.data?.strategy || "",
    attributes: payload?.attributes || payload?.data?.attributes || null
  };
}

export async function refinePrompt({ rawPrompt }, signal) {
  const response = await fetch(apiRoutes.promptRefine, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rawPrompt
    }),
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: INVALID_REFINE_RESPONSE }));

  if (!response.ok) {
    throw new Error(payload.message || REFINE_PROMPT_FAILED);
  }

  const result = normalizeRefineResponse(payload);

  if (!result.refinedPrompt.trim()) {
    throw new Error(EMPTY_REFINED_PROMPT);
  }

  return result;
}
