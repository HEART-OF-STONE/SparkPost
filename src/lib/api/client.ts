const workersApiBaseUrl = process.env.NEXT_PUBLIC_WORKERS_API_BASE_URL?.replace(/\/$/, "");

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

export const buildApiUrl = (path: string) => {
  const normalizedPath = normalizePath(path);
  return workersApiBaseUrl ? `${workersApiBaseUrl}${normalizedPath}` : normalizedPath;
};

export const fetchApi = (path: string, init: RequestInit = {}) => {
  return fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });
};
