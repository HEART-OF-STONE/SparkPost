const getServerWorkersApiBaseUrl = () =>
  process.env.WORKERS_API_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_WORKERS_API_BASE_URL?.replace(/\/$/, "") ||
  "";

export const hasServerWorkersApiBaseUrl = () => getServerWorkersApiBaseUrl().length > 0;

export async function proxyToWorkersRequest(request: Request, pathname?: string) {
  const baseUrl = getServerWorkersApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(pathname ?? incomingUrl.pathname, `${baseUrl}/`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  const init = {
    method: request.method,
    headers,
    redirect: "manual" as RequestRedirect,
  };

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, {
    ...init,
    ...(body ? { body } : {}),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}
