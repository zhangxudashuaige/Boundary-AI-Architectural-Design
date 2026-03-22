const FALLBACK_API_BASE_URL = "http://localhost:3000";

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_BASE_URL).replace(/\/$/, "");
}

export const apiRoutes = {
  upload: "/api/upload",
  render: "/api/render"
};
