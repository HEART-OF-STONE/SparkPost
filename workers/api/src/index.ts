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
  SESSION_SECRET?: string;
  IMAGE_BACKEND?: string;
  IMAGE_API_KEY?: string;
  IMAGE_MODEL?: string;
}

type JsonRecord = Record<string, unknown>;

type RouteHandler = (request: Request, env: Env, url: URL) => Promise<Response> | Response;

type SessionPayload = {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

type AuthenticatedUserRow = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  creditBalance: number | null;
};

const DEFAULT_IMAGE_BACKEND = "official";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-openai";
const SESSION_COOKIE_NAME = "sparkpost_session";

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

const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
};

const getImageBackendConfig = (env: Env) => {
  const backend = env.IMAGE_BACKEND ?? DEFAULT_IMAGE_BACKEND;
  const apiKey = env.IMAGE_API_KEY ?? "";
  const model = env.IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;

  return {
    backend,
    apiKey,
    model,
    status:
      ["official", "relay"].includes(backend) && apiKey.length > 0 ? "available" : "unavailable",
  };
};

const getSessionSecret = (env: Env) => {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  throw new Error("SESSION_SECRET is required for Workers auth routes.");
};

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
};

const decodeBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const verifySessionToken = async (token: string | undefined, env: Env): Promise<SessionPayload | null> => {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignatureBuffer = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)),
  );
  const actualSignatureBuffer = Buffer.from(signature, "base64url");

  if (!constantTimeEqual(actualSignatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.userId || !payload.email || Date.now() >= payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

const getAuthenticatedUser = async (request: Request, env: Env) => {
  const sessionToken = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  const session = await verifySessionToken(sessionToken, env);

  if (!session) {
    return { ok: true, user: null } as const;
  }

  if (!env.SPARKPOST_DB) {
    return {
      ok: false,
      response: json(
        {
          error: "Authentication service is temporarily unavailable.",
        },
        { status: 503 },
      ),
    } as const;
  }

  const user = await env.SPARKPOST_DB.prepare(
    `SELECT
       users.id,
       users.email,
       users.created_at AS createdAt,
       users.email_verified_at AS emailVerifiedAt,
       users.last_login_at AS lastLoginAt,
       COALESCE(credit_accounts.balance, 0) AS creditBalance
     FROM users
     LEFT JOIN credit_accounts ON credit_accounts.user_id = users.id
     WHERE users.id = ?
     LIMIT 1`,
  )
    .bind(session.userId)
    .first<AuthenticatedUserRow>();

  if (!user || user.email !== session.email) {
    return { ok: true, user: null } as const;
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      creditBalance: user.creditBalance ?? 0,
    },
  } as const;
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
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);

      if (!authenticatedUser.ok) {
        return authenticatedUser.response;
      }

      return json({
        user: authenticatedUser.user,
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
    handler: async (_request, env) => {
      const imageConfig = getImageBackendConfig(env);

      return json({
        status: imageConfig.status,
        model: imageConfig.model,
      });
    },
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
