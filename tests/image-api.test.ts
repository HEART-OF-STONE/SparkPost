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

type ImageTaskBody = {
  ok: true;
  task: {
    id: string;
    status: string;
    prompt: string;
    model: string;
    costCredits: number;
    remainingCredits: number;
    assets: Array<{ id: string; fileUrl: string }>;
  };
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

test("POST /api/generate/image requires auth", async () => {
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/generate/image/route",
    {
      "@/lib/auth/user": {
        getAuthenticatedUser: async () => null,
      },
    },
  );

  const response = await route.POST(jsonRequest("http://localhost/api/generate/image", { prompt: "a red lantern on the moon" }));
  const result = await readJsonResponse<{ error: string }>(response);

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Authentication required.");
});

test("POST /api/generate/image validates prompt", async () => {
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/generate/image/route",
    {
      "@/lib/auth/user": {
        getAuthenticatedUser: async () => ({ id: "user-1" }),
      },
    },
  );

  const response = await route.POST(jsonRequest("http://localhost/api/generate/image", { prompt: "  " }, { cookie: "sparkpost_session=test" }));
  const result = await readJsonResponse<{ error: string }>(response);

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Prompt must be at least 3 characters.");
});

test("POST /api/generate/image returns task payload on success", async () => {
  const route = await loadRoute<{ POST: (request: Request) => Promise<Response> }>(
    "@/app/api/generate/image/route",
    {
      "@/lib/auth/user": {
        getAuthenticatedUser: async () => ({ id: "user-1" }),
      },
      "@/lib/image/service": {
        validateTextToImageInput: (input: unknown) => {
          const prompt =
            typeof input === "object" && input !== null && "prompt" in input
              ? String((input as { prompt: string }).prompt).trim()
              : "";

          return prompt
            ? { ok: true as const, prompt }
            : { ok: false as const, error: "Prompt is required." };
        },
        generateTextToImageForUser: async (_userId: string, prompt: string) => ({
          id: "task-1",
          status: "succeeded",
          prompt,
          createdAt: new Date("2026-03-29T12:00:00.000Z"),
          completedAt: new Date("2026-03-29T12:00:03.000Z"),
          model: "gpt-image-1",
          costCredits: 10,
          remainingCredits: 10,
          assets: [
            {
              id: "asset-1",
              fileUrl: "/uploads/generated/task-1.png",
              width: null,
              height: null,
            },
          ],
        }),
        ImageGenerationAuthError: class ImageGenerationAuthError extends Error {},
        ImageGenerationConfigError: class ImageGenerationConfigError extends Error {},
        ImageGenerationCreditsError: class ImageGenerationCreditsError extends Error {},
        ImageGenerationProviderError: class ImageGenerationProviderError extends Error {},
      },
    },
  );

  const response = await route.POST(
    jsonRequest(
      "http://localhost/api/generate/image",
      { prompt: "cinematic portrait of a fox astronaut" },
      { cookie: "sparkpost_session=test" },
    ),
  );
  const result = await readJsonResponse<ImageTaskBody>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.task.id, "task-1");
  assert.equal(result.body.task.status, "succeeded");
  assert.equal(result.body.task.model, "gpt-image-1");
  assert.equal(result.body.task.assets[0]?.fileUrl, "/uploads/generated/task-1.png");
});
