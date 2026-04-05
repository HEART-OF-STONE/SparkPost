export interface Env {
  SPARKPOST_DB?: {
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        first: <T = unknown>() => Promise<T | null>;
        run: () => Promise<{ meta?: { changes?: number } }>;
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
  DEV_AUTH_DEBUG_CODE?: string;
  AUTH_CODE_TTL_MINUTES?: string;
  AUTH_CODE_COOLDOWN_SECONDS?: string;
  AUTH_VERIFY_CODE_MAX_ATTEMPTS?: string;
  AUTH_VERIFY_CODE_LOCKOUT_SECONDS?: string;
  AUTH_SESSION_TTL_DAYS?: string;
  SIGNUP_BONUS_CREDITS?: string;
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

type VerificationCodeRow = {
  id: string;
  email: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: string;
  lockedUntil: string | null;
  usedAt: string | null;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_IMAGE_BACKEND = "official";
const DEFAULT_IMAGE_MODEL = "dall-e-3";
const DEFAULT_CODE_TTL_MINUTES = 10;
const DEFAULT_CODE_COOLDOWN_SECONDS = 60;
const DEFAULT_VERIFY_CODE_MAX_ATTEMPTS = 5;
const DEFAULT_VERIFY_CODE_LOCKOUT_SECONDS = 15 * 60;
const DEFAULT_SESSION_TTL_DAYS = 7;
const DEFAULT_SIGNUP_BONUS_CREDITS = 20;
const SESSION_COOKIE_NAME = "sparkpost_session";
const SESSION_COOKIE_PATH = "/";

const getNumberEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getAuthConfig = (env: Env) => ({
  codeLength: 6,
  codeTtlMinutes: getNumberEnv(env.AUTH_CODE_TTL_MINUTES, DEFAULT_CODE_TTL_MINUTES),
  codeCooldownSeconds: getNumberEnv(env.AUTH_CODE_COOLDOWN_SECONDS, DEFAULT_CODE_COOLDOWN_SECONDS),
  verifyCodeMaxAttempts: getNumberEnv(
    env.AUTH_VERIFY_CODE_MAX_ATTEMPTS,
    DEFAULT_VERIFY_CODE_MAX_ATTEMPTS,
  ),
  verifyCodeLockoutSeconds: getNumberEnv(
    env.AUTH_VERIFY_CODE_LOCKOUT_SECONDS,
    DEFAULT_VERIFY_CODE_LOCKOUT_SECONDS,
  ),
  sessionTtlDays: getNumberEnv(env.AUTH_SESSION_TTL_DAYS, DEFAULT_SESSION_TTL_DAYS),
  signupBonusCredits: getNumberEnv(env.SIGNUP_BONUS_CREDITS, DEFAULT_SIGNUP_BONUS_CREDITS),
});

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");

  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": origin ? "true" : "false",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
    vary: "Origin",
  };
};

const withCors = (request: Request, response: Response) => {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(getCorsHeaders(request))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

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

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) => email.length <= 320 && EMAIL_REGEX.test(email);

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
const encodeBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const hmacSha256 = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createSessionToken = async (userId: string, email: string, env: Env) => {
  const authConfig = getAuthConfig(env);
  const issuedAt = Date.now();
  const expiresAt = issuedAt + authConfig.sessionTtlDays * 24 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    userId,
    email,
    issuedAt,
    expiresAt,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = Buffer.from(await hmacSha256(encodedPayload, getSessionSecret(env))).toString("base64url");

  return `${encodedPayload}.${signature}`;
};

const verifySessionToken = async (token: string | undefined, env: Env): Promise<SessionPayload | null> => {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignatureBuffer = await hmacSha256(encodedPayload, getSessionSecret(env));
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

const parseJsonBody = async (request: Request) => {
  try {
    return { ok: true as const, body: (await request.json()) as unknown };
  } catch {
    return { ok: false as const, error: "Request body must be valid JSON." };
  }
};

const validateSendCodeInput = (input: unknown) => {
  const email =
    typeof input === "object" && input !== null && !Array.isArray(input) && "email" in input
      ? input.email
      : undefined;

  if (typeof email !== "string") {
    return { ok: false as const, error: "Email is required." };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  return { ok: true as const, email: normalizedEmail };
};

const validateVerifyCodeInput = (input: unknown, env: Env) => {
  const email =
    typeof input === "object" && input !== null && !Array.isArray(input) && "email" in input
      ? input.email
      : undefined;
  const code =
    typeof input === "object" && input !== null && !Array.isArray(input) && "code" in input
      ? input.code
      : undefined;

  if (typeof email !== "string" || typeof code !== "string") {
    return { ok: false as const, error: "Email and code are required." };
  }

  const authConfig = getAuthConfig(env);
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const codePattern = new RegExp(`^\\d{${authConfig.codeLength}}$`);

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  if (!codePattern.test(normalizedCode)) {
    return {
      ok: false as const,
      error: `Verification code must be ${authConfig.codeLength} digits.`,
    };
  }

  return { ok: true as const, email: normalizedEmail, code: normalizedCode };
};

const generateVerificationCode = (env: Env) => {
  const authConfig = getAuthConfig(env);
  const min = 10 ** (authConfig.codeLength - 1);
  const max = 10 ** authConfig.codeLength;
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(min + (randomValue % (max - min)));
};

const hashVerificationCode = async (email: string, code: string, env: Env) => {
  return sha256Hex(`${normalizeEmail(email)}:${code}:${getSessionSecret(env)}`);
};

const shouldExposeDebugCode = (env: Env) => env.DEV_AUTH_DEBUG_CODE === "true";

const issueVerificationCode = async (email: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new Error("D1 binding SPARKPOST_DB is not configured.");
  }

  const authConfig = getAuthConfig(env);
  const now = new Date();
  const latestCode = await env.SPARKPOST_DB.prepare(
    `SELECT created_at AS createdAt
     FROM email_verification_codes
     WHERE email = ?
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(email)
    .first<{ createdAt: string }>();

  if (latestCode) {
    const millisecondsSinceLastCode = now.getTime() - new Date(latestCode.createdAt).getTime();
    const cooldownMilliseconds = authConfig.codeCooldownSeconds * 1000;

    if (millisecondsSinceLastCode < cooldownMilliseconds) {
      return {
        ok: false as const,
        retryAfterSeconds: Math.ceil((cooldownMilliseconds - millisecondsSinceLastCode) / 1000),
      };
    }
  }

  const code = generateVerificationCode(env);
  const expiresAt = new Date(now.getTime() + authConfig.codeTtlMinutes * 60 * 1000);
  const codeHash = await hashVerificationCode(email, code, env);

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO email_verification_codes (
       id, email, code_hash, expires_at, attempt_count, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 0, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      email,
      codeHash,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    )
    .run();

  return {
    ok: true as const,
    expiresAt,
    ...(shouldExposeDebugCode(env) ? { debugCode: code } : {}),
  };
};

const verifyCodeAndProvisionUser = async (email: string, code: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new Error("D1 binding SPARKPOST_DB is not configured.");
  }

  const authConfig = getAuthConfig(env);
  const now = new Date();
  const codeHash = await hashVerificationCode(email, code, env);
  const verificationCode = await env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       email,
       code_hash AS codeHash,
       attempt_count AS attemptCount,
       expires_at AS expiresAt,
       locked_until AS lockedUntil,
       used_at AS usedAt,
       created_at AS createdAt
     FROM email_verification_codes
     WHERE email = ?
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(email)
    .first<VerificationCodeRow>();

  if (!verificationCode) {
    return { ok: false as const, reason: "invalid" };
  }

  if (verificationCode.usedAt) {
    return { ok: false as const, reason: "used" };
  }

  if (new Date(verificationCode.expiresAt) <= now) {
    return { ok: false as const, reason: "expired" };
  }

  if (verificationCode.lockedUntil && new Date(verificationCode.lockedUntil) > now) {
    return {
      ok: false as const,
      reason: "locked",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((new Date(verificationCode.lockedUntil).getTime() - now.getTime()) / 1000),
      ),
    };
  }

  if (verificationCode.codeHash !== codeHash) {
    const nextAttemptCount = verificationCode.attemptCount + 1;
    const shouldLockCode = nextAttemptCount >= authConfig.verifyCodeMaxAttempts;
    const lockedUntil = shouldLockCode
      ? new Date(now.getTime() + authConfig.verifyCodeLockoutSeconds * 1000).toISOString()
      : null;

    await env.SPARKPOST_DB.prepare(
      `UPDATE email_verification_codes
       SET attempt_count = ?, locked_until = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(nextAttemptCount, lockedUntil, now.toISOString(), verificationCode.id)
      .run();

    if (shouldLockCode) {
      return {
        ok: false as const,
        reason: "locked",
        retryAfterSeconds: authConfig.verifyCodeLockoutSeconds,
      };
    }

    return { ok: false as const, reason: "invalid" };
  }

  const markUsed = await env.SPARKPOST_DB.prepare(
    `UPDATE email_verification_codes
     SET used_at = ?, updated_at = ?
     WHERE id = ?
       AND used_at IS NULL
       AND (locked_until IS NULL OR locked_until <= ?)`,
  )
    .bind(now.toISOString(), now.toISOString(), verificationCode.id, now.toISOString())
    .run();

  if ((markUsed.meta?.changes ?? 0) !== 1) {
    return { ok: false as const, reason: "invalid" };
  }

  let user = await env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       email,
       created_at AS createdAt,
       email_verified_at AS emailVerifiedAt,
       last_login_at AS lastLoginAt
     FROM users
     WHERE email = ?
     LIMIT 1`,
  )
    .bind(email)
    .first<UserRow>();

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const userId = crypto.randomUUID();
    await env.SPARKPOST_DB.prepare(
      `INSERT INTO users (
         id, email, email_verified_at, last_login_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, email, now.toISOString(), now.toISOString(), now.toISOString(), now.toISOString())
      .run();

    user = {
      id: userId,
      email,
      createdAt: now.toISOString(),
      emailVerifiedAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
    };
  } else {
    const nextVerifiedAt = user.emailVerifiedAt ?? now.toISOString();
    await env.SPARKPOST_DB.prepare(
      `UPDATE users
       SET email_verified_at = ?, last_login_at = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(nextVerifiedAt, now.toISOString(), now.toISOString(), user.id)
      .run();

    user = {
      ...user,
      emailVerifiedAt: nextVerifiedAt,
      lastLoginAt: now.toISOString(),
    };
  }

  const existingCreditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  )
    .bind(user.id)
    .first<{ balance: number }>();

  if (!existingCreditAccount) {
    await env.SPARKPOST_DB.prepare(
      `INSERT INTO credit_accounts (
         id, user_id, balance, currency, created_at, updated_at
       ) VALUES (?, ?, ?, 'credits', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        isNewUser ? authConfig.signupBonusCredits : 0,
        now.toISOString(),
        now.toISOString(),
      )
      .run();
  }

  const creditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  )
    .bind(user.id)
    .first<{ balance: number }>();

  await env.SPARKPOST_DB.prepare(
    `UPDATE email_verification_codes
     SET used_by_user_id = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(user.id, now.toISOString(), verificationCode.id)
    .run();

  return {
    ok: true as const,
    isNewUser,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      creditBalance: creditAccount?.balance ?? 0,
    },
  };
};

const buildSessionCookie = async (userId: string, email: string, request: Request, env: Env) => {
  const authConfig = getAuthConfig(env);
  const token = await createSessionToken(userId, email, env);
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=${SESSION_COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${authConfig.sessionTtlDays * 24 * 60 * 60}`,
  ];

  return parts.join("; ");
};

const buildLogoutCookie = () =>
  [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${SESSION_COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");

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
    handler: async (request, env) => {
      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) {
        return json({ error: bodyResult.error }, { status: 400 });
      }

      const input = validateSendCodeInput(bodyResult.body);
      if (!input.ok) {
        return json({ error: input.error }, { status: 400 });
      }

      const result = await issueVerificationCode(input.email, env);
      if (!result.ok) {
        return json(
          {
            error: "Please wait before requesting another verification code.",
            retryAfterSeconds: result.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfterSeconds),
            },
          },
        );
      }

      return json({
        ok: true,
        email: input.email,
        expiresAt: result.expiresAt.toISOString(),
        ...(result.debugCode ? { debugCode: result.debugCode } : {}),
      });
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/verify-code",
    handler: async (request, env) => {
      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) {
        return json({ error: bodyResult.error }, { status: 400 });
      }

      const input = validateVerifyCodeInput(bodyResult.body, env);
      if (!input.ok) {
        return json({ error: input.error }, { status: 400 });
      }

      const result = await verifyCodeAndProvisionUser(input.email, input.code, env);
      if (!result.ok) {
        if (result.reason === "locked") {
          return json(
            {
              error: "Too many verification attempts. Please wait before trying again.",
              retryAfterSeconds: result.retryAfterSeconds,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(result.retryAfterSeconds),
              },
            },
          );
        }

        const errorMessage =
          result.reason === "expired"
            ? "Verification code has expired."
            : result.reason === "used"
              ? "Verification code has already been used."
              : "Invalid verification code.";

        return json({ error: errorMessage }, { status: 400 });
      }

      const response = json({
        ok: true,
        isNewUser: result.isNewUser,
        user: result.user,
      });
      response.headers.set("Set-Cookie", await buildSessionCookie(result.user.id, result.user.email, request, env));
      return response;
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/logout",
    handler: async () => {
      const response = json({ ok: true });
      response.headers.set("Set-Cookie", buildLogoutCookie());
      return response;
    },
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
    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const match = routes.find(
      (route) => route.method === request.method && route.pathname === url.pathname,
    );

    try {
      if (match) {
        return withCors(request, await match.handler(request, env, url));
      }

      return withCors(
        request,
        json(
          {
            ok: false,
            error: "Route not found.",
          },
          { status: 404 },
        ),
      );
    } catch (error) {
      console.error("Workers API route failed.", error);
      return withCors(
        request,
        json(
          {
            error: "Unexpected server error.",
          },
          { status: 500 },
        ),
      );
    }
  },
};
