function normalizeApiBaseUrl(value) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required and must point to the backend base URL."
    );
  }

  let parsed = null;

  try {
    parsed = new URL(candidate);
  } catch (error) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be a valid absolute URL."
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export const apiRoutes = {
  upload: `${apiBaseUrl}/api/upload`,
  render: `${apiBaseUrl}/api/render`,
  promptRefine: `${apiBaseUrl}/api/prompt/refine`
};
