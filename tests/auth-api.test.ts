/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

declare const test: (name: string, fn: () => Promise<void> | void) => void;
declare const resolveAppModule: (specifier: string) => string;
declare const withMockedModules: <T>(
  mocks: Record<string, unknown>,
  fn: () => Promise<T> | T,
) => Promise<T>;
declare const withFrozenTime: <T>(
  initialNow: number,
  fn: (clock: { now: () => number; setNow: (nextNow: number) => void }) => Promise<T> | T,
) => Promise<T>;
declare const jsonRequest: (
  url: string,
  body: unknown,
  headers?: Record<string, string>,
) => Request;
declare const readJsonResponse: <T = unknown>(
  response: Response,
) => Promise<{ status: number; headers: Headers; body: T }>;

type MockCreditAccount = {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockUser = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creditAccount: MockCreditAccount | null;
};

type VerificationCodeRecord = {
  id: string;
  email: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: Date;
  lockedUntil: Date | null;
  usedAt: Date | null;
  usedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VerificationState = {
  code: VerificationCodeRecord;
  user: MockUser | null;
};

type JsonResponse<T> = {
  status: number;
  headers: Headers;
  body: T;
};

type SendCodeSuccessBody = {
  ok: true;
  email: string;
  expiresAt: string;
  debugCode?: string;
};

type SendCodeCooldownBody = {
  error: string;
  retryAfterSeconds: number;
};

type VerifyCodeSuccessBody = {
  ok: true;
  isNewUser: boolean;
  user: {
    id: string;
    email: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    creditBalance: number;
  };
};

type VerifyCodeErrorBody = {
  error: string;
  retryAfterSeconds?: number;
};

type MeLoggedOutBody = {
  user: null;
};

function loadRoute<T extends Record<string, unknown>>(
  specifier: string,
  mocks: Record<string, unknown>,
) {
  return withMockedModules(mocks, () => {
    const resolved = resolveAppModule(specifier);
    delete require.cache[resolved];
    return require(resolved) as T;
  });
}

function hashVerificationCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const sessionSecret = process.env.SESSION_SECRET || "sparkpost-dev-session-secret";

  return createHash("sha256")
    .update(`${normalizedEmail}:${code}:${sessionSecret}`)
    .digest("hex");
}

function createSendCodePrismaMock(createdAt: Date | null) {
  const calls = {
    findFirst: 0,
    create: 0,
  };

  return {
    calls,
    prisma: {
      emailVerificationCode: {
        async findFirst() {
          calls.findFirst += 1;
          return createdAt ? { createdAt } : null;
        },
        async create(args: { data: Record<string, unknown> }) {
          calls.create += 1;
          return args.data;
        },
      },
    },
  };
}

function createVerifyCodePrismaMock(options: {
  email: string;
  codeHash: string;
  expiresAt: Date;
  lockedUntil?: Date | null;
  usedAt?: Date | null;
  attemptCount?: number;
  existingUser?: boolean;
  creditBalance?: number;
}) {
  const state: VerificationState = {
    code: {
      id: "verification-code-1",
      email: options.email.trim().toLowerCase(),
      codeHash: options.codeHash,
      attemptCount: options.attemptCount ?? 0,
      expiresAt: options.expiresAt,
      lockedUntil: options.lockedUntil ?? null,
      usedAt: options.usedAt ?? null,
      usedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: options.existingUser
      ? {
          id: "user-existing",
          email: options.email.trim().toLowerCase(),
          name: null,
          avatar: null,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          creditAccount: {
            id: "credit-existing",
            userId: "user-existing",
            balance: options.creditBalance ?? 20,
            currency: "credits",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }
      : null,
  };

  const prisma = {
    emailVerificationCode: {
      async findFirst() {
        return state.code;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return where.id === state.code.id ? state.code : null;
      },
      async updateMany({
        where,
        data,
      }: {
        where: { id: string; usedAt: null; OR?: unknown };
        data: Record<string, unknown>;
      }) {
        const matchesId = where.id === state.code.id;
        const isAvailable = state.code.usedAt === null;
        const isUnlocked = state.code.lockedUntil === null || state.code.lockedUntil <= new Date();

        if (!matchesId || !isAvailable || !isUnlocked) {
          return { count: 0 };
        }

        state.code = {
          ...state.code,
          ...data,
          updatedAt: new Date(),
        };

        return { count: 1 };
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) {
        if (where.id !== state.code.id) {
          throw new Error("Unknown code update");
        }

        state.code = {
          ...state.code,
          ...data,
          updatedAt: new Date(),
        };

        return state.code;
      },
    },
    user: {
      async findUnique() {
        return state.user;
      },
      async create({
        data,
      }: {
        data: { email: string; emailVerifiedAt: Date; lastLoginAt: Date };
      }) {
        state.user = {
          id: "user-new",
          email: data.email,
          name: null,
          avatar: null,
          emailVerifiedAt: data.emailVerifiedAt,
          lastLoginAt: data.lastLoginAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          creditAccount: null,
        };

        return state.user;
      },
      async update({
        data,
      }: {
        data: { emailVerifiedAt: Date; lastLoginAt: Date };
      }) {
        if (!state.user) {
          throw new Error("Missing user for update");
        }

        state.user = {
          ...state.user,
          ...data,
          updatedAt: new Date(),
        };

        return state.user;
      },
    },
    creditAccount: {
      async upsert({
        create,
      }: {
        create: { userId: string; balance: number };
      }) {
        return {
          id: "credit-account-1",
          userId: create.userId,
          balance: create.balance,
          currency: "credits",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  };

  const tx = prisma;
  return {
    prisma: {
      ...prisma,
      async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
        return callback(tx);
      },
    },
    state,
  };
}

async function invokePost<T>(
  route: { POST: (request: Request) => Promise<Response> },
  body: unknown,
  headers?: Record<string, string>,
): Promise<JsonResponse<T>> {
  const response = await route.POST(jsonRequest("http://localhost/api", body, headers));
  return readJsonResponse<T>(response);
}

test("POST /api/auth/send-code success path", async () => {
  const { prisma, calls } = createSendCodePrismaMock(null);
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/auth/send-code/route",
    {
      "@/lib/prisma": { prisma },
    },
  );

  const result = await invokePost<SendCodeSuccessBody>(route, { email: "  User@Example.com  " });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.ok, true);
  assert.equal(result.body.email, "user@example.com");
  assert.equal(typeof result.body.expiresAt, "string");
  assert.match(result.body.debugCode ?? "", /^\d{6}$/);
  assert.equal(calls.findFirst, 1);
  assert.equal(calls.create, 1);
});

test("POST /api/auth/send-code cooldown hit returns 429 with retry metadata", async () => {
  const now = Date.now();
  const cooldownWindowStart = new Date(now - 5_000);
  const { prisma } = createSendCodePrismaMock(cooldownWindowStart);
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/auth/send-code/route",
    {
      "@/lib/prisma": { prisma },
    },
  );

  const result = await invokePost<SendCodeCooldownBody>(route, { email: "cooldown@example.com" });

  assert.equal(result.status, 429);
  assert.equal(result.body.error, "Please wait before requesting another verification code.");
  assert.equal(result.body.retryAfterSeconds, 55);
  assert.equal(result.headers.get("retry-after"), "55");
});

test("POST /api/auth/verify-code success login path", async () => {
  await withFrozenTime(Date.UTC(2026, 2, 29, 8, 0, 0), async () => {
    const email = "verify@example.com";
    const code = "123456";
    const { prisma } = createVerifyCodePrismaMock({
      email,
      codeHash: hashVerificationCode(email, code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      creditBalance: 20,
    });

    const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
      "@/app/api/auth/verify-code/route",
      {
        "@/lib/prisma": { prisma },
      },
    );

    const result = await invokePost<VerifyCodeSuccessBody>(route, {
      email: " VERIFY@example.com ",
      code,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.isNewUser, true);
    assert.equal(result.body.user.email, email);
    assert.equal(result.body.user.creditBalance, 20);
    assert.match(String(result.headers.get("set-cookie") ?? ""), /sparkpost_session=/);
    assert.match(String(result.headers.get("set-cookie") ?? ""), /HttpOnly/i);
  });
});

test("POST /api/auth/verify-code wrong code increments failure state", async () => {
  await withFrozenTime(Date.UTC(2026, 2, 29, 8, 10, 0), async (clock) => {
    const email = "failure@example.com";
    const code = "654321";
    const { prisma } = createVerifyCodePrismaMock({
      email,
      codeHash: hashVerificationCode(email, "123456"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const { clearVerifyCodeThrottle, getVerifyCodeThrottleKey, checkVerifyCodeThrottle } = require(
      resolveAppModule("@/lib/auth/verification-throttle"),
    ) as typeof import("@/lib/auth/verification-throttle");
    clearVerifyCodeThrottle(
      getVerifyCodeThrottleKey(
        email,
        new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.10" } }),
      ),
    );

    const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
      "@/app/api/auth/verify-code/route",
      {
        "@/lib/prisma": { prisma },
      },
    );

    const headers = { "x-forwarded-for": "203.0.113.10" };
    const first = await invokePost<VerifyCodeErrorBody>(route, { email, code }, headers);
    assert.equal(first.status, 400);
    assert.equal(first.body.error, "Invalid verification code.");

    clock.setNow(clock.now() + 3_100);
    const second = await invokePost<VerifyCodeErrorBody>(route, { email, code }, headers);
    assert.equal(second.status, 400);
    assert.equal(second.body.error, "Invalid verification code.");

    const throttleKey = getVerifyCodeThrottleKey(
      email,
      new Request("http://localhost", { headers }),
    );
    const throttleState = checkVerifyCodeThrottle(throttleKey, clock.now() + 1);

    assert.equal(throttleState.ok, false);
    assert.equal(throttleState.retryAfterSeconds, 3);
  });
});

test("POST /api/auth/verify-code repeated failures trigger lockout", async () => {
  await withFrozenTime(Date.UTC(2026, 2, 29, 8, 20, 0), async (clock) => {
    const email = "lockout@example.com";
    const code = "000000";
    const { prisma } = createVerifyCodePrismaMock({
      email,
      codeHash: hashVerificationCode(email, "999999"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
      "@/app/api/auth/verify-code/route",
      {
        "@/lib/prisma": { prisma },
      },
    );

    const headers = { "x-forwarded-for": "203.0.113.11" };
    let responseBody: JsonResponse<VerifyCodeErrorBody> | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      responseBody = await invokePost<VerifyCodeErrorBody>(route, { email, code }, headers);

      if (attempt < 5) {
        assert.equal(responseBody.status, 400);
        assert.equal(responseBody.body.error, "Invalid verification code.");
      } else {
        assert.equal(responseBody.status, 429);
        assert.equal(
          responseBody.body.error,
          "Too many verification attempts. Please wait before trying again.",
        );
        assert.equal(responseBody.body.retryAfterSeconds, 15 * 60);
        assert.equal(responseBody.headers.get("retry-after"), String(15 * 60));
      }

      clock.setNow(clock.now() + 3_100);
    }
  });
});

test("POST /api/auth/verify-code lockout hit returns 429 with retry metadata", async () => {
  await withFrozenTime(Date.UTC(2026, 2, 29, 8, 30, 0), async (clock) => {
    const email = "blocked@example.com";
    const code = "111111";
    const { prisma } = createVerifyCodePrismaMock({
      email,
      codeHash: hashVerificationCode(email, "222222"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
      "@/app/api/auth/verify-code/route",
      {
        "@/lib/prisma": { prisma },
      },
    );

    const headers = { "x-forwarded-for": "203.0.113.12" };
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const responseBody = await invokePost<VerifyCodeErrorBody>(route, { email, code }, headers);
      if (attempt < 5) {
        assert.equal(responseBody.status, 400);
      } else {
        assert.equal(responseBody.status, 429);
      }
      clock.setNow(clock.now() + 3_100);
    }

    const locked = await invokePost<VerifyCodeErrorBody>(route, { email, code }, headers);
    assert.equal(locked.status, 429);
    assert.equal(
      locked.body.error,
      "Too many verification attempts. Please wait before trying again.",
    );
    assert.equal(locked.body.retryAfterSeconds, 15 * 60 - 3);
    assert.equal(locked.headers.get("retry-after"), String(15 * 60 - 3));
  });
});

test("GET /api/me returns 200 with user null when logged out", async () => {
  const route = await loadRoute<{ GET: (request: Request) => Promise<Response> }>(
    "@/app/api/me/route",
    {
      "@/lib/prisma": {
        prisma: {
          user: {
            async findUnique() {
              return null;
            },
          },
        },
      },
    },
  );

  const response = await route.GET(new Request("http://localhost/api/me"));
  const result = await readJsonResponse<MeLoggedOutBody>(response);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { user: null });
});
