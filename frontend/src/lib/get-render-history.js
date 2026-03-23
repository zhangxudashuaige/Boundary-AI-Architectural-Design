import { apiRoutes } from "@/config/api";

const INVALID_HISTORY_RESPONSE = "历史记录服务返回了无法解析的响应。";
const GET_HISTORY_FAILED = "获取历史记录失败，请稍后重试。";

function normalizeHistoryResponse(payload) {
  return {
    tasks: payload?.data?.tasks || payload?.tasks || [],
    pagination: payload?.data?.pagination || payload?.pagination || null
  };
}

export async function getRenderHistory({ limit = 24, offset = 0 } = {}, signal) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  const response = await fetch(`${apiRoutes.render}?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal
  });

  const payload = await response
    .json()
    .catch(() => ({ message: INVALID_HISTORY_RESPONSE }));

  if (!response.ok) {
    throw new Error(payload.message || GET_HISTORY_FAILED);
  }

  const result = normalizeHistoryResponse(payload);

  if (!Array.isArray(result.tasks)) {
    throw new Error(INVALID_HISTORY_RESPONSE);
  }

  return result;
}
