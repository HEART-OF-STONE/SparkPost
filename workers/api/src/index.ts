export interface Env {
  SPARKPOST_DB?: {
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        first: <T = unknown>() => Promise<T | null>;
      };
    };
  };
  SPARKPOST_ASSETS?: {
    fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
  };
  SPARKPOST_R2?: unknown;
}

type JsonRecord = Record<string, unknown>;

type RouteHandler = (request: Request, env: Env, url: URL) => Promise<Response> | Response;

const json = (body: JsonRecord, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

const routeNotReady = (capability: string) =>
  json(
    {
      ok: false,
      error: `${capability} is not wired to Cloudflare Workers yet.`,
      nextStep: "Migrate this route from Next.js route handlers to workers/api/src/index.ts.",
    },
    { status: 501 },
  );

const ensureDatabase = (env: Env) => {
  if (!env.SPARKPOST_DB) {
    return json(
      {
        ok: false,
        error: "D1 binding SPARKPOST_DB is not configured.",
      },
      { status: 503 },
    );
  }

  return null;
};

const routes: Array<{ method: string; pathname: string; handler: RouteHandler }> = [
  {
    method: "GET",
    pathname: "/api/health",
    handler: async (_request, env) => {
      const databaseState = env.SPARKPOST_DB ? "configured" : "missing";
      const assetState = env.SPARKPOST_R2 ? "configured" : "missing";
      return json({
        ok: true,
        service: "sparkpost-workers-api",
        database: databaseState,
        objectStorage: assetState,
      });
    },
  },
  {
    method: "GET",
    pathname: "/api/me",
    handler: async (_request, env) => {
      const databaseError = ensureDatabase(env);
      if (databaseError) {
        return databaseError;
      }

      return json({
        ok: true,
        user: null,
        mode: "workers-skeleton",
      });
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/send-code",
    handler: async () => routeNotReady("Email verification"),
  },
  {
    method: "POST",
    pathname: "/api/auth/verify-code",
    handler: async () => routeNotReady("Verification sign-in"),
  },
  {
    method: "POST",
    pathname: "/api/auth/logout",
    handler: async () => json({ ok: true }),
  },
  {
    method: "POST",
    pathname: "/api/generate/image",
    handler: async () => routeNotReady("Image generation"),
  },
  {
    method: "GET",
    pathname: "/api/generate/status",
    handler: async () =>
      json({
        ok: true,
        provider: "workers-skeleton",
        available: false,
      }),
  },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = routes.find(
      (route) => route.method === request.method && route.pathname === url.pathname,
    );

    if (match) {
      return match.handler(request, env, url);
    }

    return json(
      {
        ok: false,
        error: "Route not found.",
      },
      { status: 404 },
    );
  },
};