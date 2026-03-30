/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";

declare const test: (name: string, fn: () => Promise<void> | void) => void;
declare const resolveAppModule: (specifier: string) => string;
declare const withMockedModules: <T>(
  mocks: Record<string, unknown>,
  fn: () => Promise<T> | T,
) => Promise<T>;
declare const jsonRequest: (
  url: string,
  body: unknown,
  headers?: Record<string, string>,
) => Request;
declare const readJsonResponse: <T = unknown>(
  response: Response,
) => Promise<{ status: number; headers: Headers; body: T }>;

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

async function invokePost<T>(
  route: { POST: (request: Request) => Promise<Response> },
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; headers: Headers; body: T }> {
  const response = await route.POST(jsonRequest("http://localhost/api", body, headers));
  return readJsonResponse<T>(response);
}

test("POST /api/images/generate completes a minimal generation task", async () => {
  const taskCreates: Array<Record<string, unknown>> = [];
  const taskUpdates: Array<Record<string, unknown>> = [];
  const assetCreates: Array<Record<string, unknown>> = [];

  process.env.IMAGE_BACKEND = "official";
  process.env.IMAGE_BASE_URL = "https://provider.example/v1/images/generations";
  process.env.IMAGE_API_KEY = "test-api-key";
  process.env.IMAGE_MODEL = "nano-banana";
  process.env.TEXT_TO_IMAGE_COST = "10";

  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/images/generate/route",
    {
      "@/lib/auth/user": {
        getAuthenticatedUser: async () => ({
          id: "user-1",
          email: "artist@example.com",
          createdAt: new Date("2026-03-29T08:00:00.000Z"),
          emailVerifiedAt: new Date("2026-03-29T08:00:00.000Z"),
          lastLoginAt: new Date("2026-03-29T08:01:00.000Z"),
          creditBalance: 20,
        }),
      },
      "@/lib/prisma": {
        prisma: {
          generationTask: {
            async create(args: { data: Record<string, unknown> }) {
              taskCreates.push(args.data);
              return {
                id: "task-1",
                ...args.data,
                status: "processing",
                createdAt: new Date("2026-03-29T08:02:00.000Z"),
                completedAt: null,
                errorMessage: null,
              };
            },
            async update(args: { where: { id: string }; data: Record<string, unknown> }) {
              taskUpdates.push(args.data);
              return {
                id: args.where.id,
                userId: "user-1",
                taskType: "text_to_image",
                status: args.data.status,
                prompt: "a red paper dragon in the rain",
                inputImageUrl: null,
                model: "nano-banana",
                costCredits: 10,
                errorMessage: null,
                createdAt: new Date("2026-03-29T08:02:00.000Z"),
                completedAt: args.data.completedAt ?? null,
              };
            },
          },
          generatedAsset: {
            async create(args: { data: Record<string, unknown> }) {
              assetCreates.push(args.data);
              return {
                id: "asset-1",
                ...args.data,
                createdAt: new Date("2026-03-29T08:02:10.000Z"),
              };
            },
          },
        },
      },
    },
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            url: "https://cdn.sparkpost.test/generated/task-1.png",
            width: 1024,
            height: 1024,
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as typeof fetch;

  try {
    const result = await invokePost<{ ok: true; task: { status: string }; asset: { fileUrl: string } }>(
      route,
      { prompt: "a red paper dragon in the rain" },
      { cookie: "sparkpost_session=session-token" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.task.status, "completed");
    assert.equal(result.body.asset.fileUrl, "https://cdn.sparkpost.test/generated/task-1.png");
    assert.equal(taskCreates[0]?.taskType, "text_to_image");
    assert.equal(taskCreates[0]?.costCredits, 10);
    assert.equal(taskUpdates[0]?.status, "completed");
    assert.equal(assetCreates[0]?.assetType, "image");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/images/generate returns 401 without auth", async () => {
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/images/generate/route",
    {
      "@/lib/auth/user": {
        getAuthenticatedUser: async () => null,
      },
      "@/lib/prisma": {
        prisma: {
          generationTask: {
            async create() {
              throw new Error("should not create");
            },
          },
          generatedAsset: {
            async create() {
              throw new Error("should not create");
            },
          },
        },
      },
    },
  );

  const response = await route.POST(jsonRequest("http://localhost/api", { prompt: "hi" }));
  const result = await readJsonResponse<{ error: string }>(response);

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Authentication required.");
});
