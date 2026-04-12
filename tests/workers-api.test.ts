/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

declare const test: (name: string, fn: () => Promise<void> | void) => void;
declare const readJsonResponse: <T = unknown>(
  response: Response,
) => Promise<{ status: number; headers: Headers; body: T }>;

type D1RunResult = { meta?: { changes?: number } };

type GeneratedTask = {
  id: string;
  status: string;
  prompt: string;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
};

type FakeState = {
  user: {
    id: string;
    email: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    creditBalance: number;
  };
  creditBalance: number;
  generatedTask: GeneratedTask | null;
  generatedAssetUrl: string | null;
};

function createSessionToken(userId: string, email: string, secret: string) {
  const payload = {
    userId,
    email,
    issuedAt: 1_700_000_000_000,
    expiresAt: 4_000_000_000_000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function createFakeDb(state: FakeState) {
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM users") && sql.includes("LEFT JOIN credit_accounts")) {
                const lookupValue = values[0];
                if (lookupValue !== state.user.id && lookupValue !== state.user.email) return null;
                return state.user as T;
              }

              if (sql.includes("SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1")) {
                return { balance: state.creditBalance } as T;
              }

              if (sql.includes("FROM generation_tasks WHERE id = ? LIMIT 1")) {
                return state.generatedTask as T;
              }

              return null;
            },
              async run(): Promise<D1RunResult> {
                if (sql.includes("INSERT INTO generation_tasks")) {
                  const includesCompiledPrompt = sql.includes("compiled_prompt");
                  const promptIndex = 2;
                  const modelIndex = includesCompiledPrompt ? 4 : 3;
                  const costIndex = includesCompiledPrompt ? 5 : 4;
                  const createdAtIndex = includesCompiledPrompt
                    ? sql.includes("input_image_url")
                      ? 7
                      : 6
                    : 5;
                  state.generatedTask = {
                    id: String(values[0]),
                    status: "running",
                    prompt: String(values[promptIndex]),
                    model: String(values[modelIndex]),
                    costCredits: Number(values[costIndex]),
                    createdAt: String(values[createdAtIndex]),
                    completedAt: null,
                  };
                  return { meta: { changes: 1 } };
                }

              if (sql.includes("UPDATE credit_accounts SET balance = ?")) {
                state.creditBalance = Number(values[0]);
                state.user.creditBalance = state.creditBalance;
                return { meta: { changes: 1 } };
              }

              if (sql.includes("INSERT INTO credit_transactions")) {
                return { meta: { changes: 1 } };
              }

              if (sql.includes("INSERT INTO generated_assets")) {
                state.generatedAssetUrl = String(values[2]);
                return { meta: { changes: 1 } };
              }

              if (sql.includes("UPDATE users") && sql.includes("email_verified_at")) {
                state.user.emailVerifiedAt = String(values[0]);
                state.user.lastLoginAt = String(values[1]);
                return { meta: { changes: 1 } };
              }

              if (sql.includes("UPDATE generation_tasks SET status = 'succeeded'")) {
                if (state.generatedTask) {
                  state.generatedTask.status = "succeeded";
                  state.generatedTask.model = String(values[0]);
                  state.generatedTask.completedAt = String(values[1]);
                }
                return { meta: { changes: 1 } };
              }

              if (sql.includes("UPDATE generation_tasks SET status = 'failed'")) {
                if (state.generatedTask) {
                  state.generatedTask.status = "failed";
                  state.generatedTask.completedAt = String(values[1]);
                }
                return { meta: { changes: 1 } };
              }

              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
}

function createVerificationDb() {
  const insertedCodes: Array<{ id: string; email: string; codeHash: string; expiresAt: string }> = [];

  return {
    insertedCodes,
    db: {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async first<T>() {
                if (sql.includes("FROM email_verification_codes")) {
                  return null as T | null;
                }

                return null;
              },
              async run(): Promise<D1RunResult> {
                if (sql.includes("INSERT INTO email_verification_codes")) {
                  insertedCodes.push({
                    id: String(values[0]),
                    email: String(values[1]),
                    codeHash: String(values[2]),
                    expiresAt: String(values[3]),
                  });
                  return { meta: { changes: 1 } };
                }

                return { meta: { changes: 0 } };
              },
            };
          },
        };
      },
    },
  };
}

function createFakeR2() {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();

  return {
    store,
    bucket: {
      async put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string, options?: { httpMetadata?: { contentType?: string } }) {
        const contentType = options?.httpMetadata?.contentType ?? "application/octet-stream";
        let bytes: Uint8Array;

        if (typeof value === "string") {
          bytes = new TextEncoder().encode(value);
        } else if (value instanceof Uint8Array) {
          bytes = value;
        } else if (ArrayBuffer.isView(value)) {
          bytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
        } else if (value instanceof ArrayBuffer) {
          bytes = new Uint8Array(value);
        } else {
          throw new Error("Unsupported R2 put value in smoke test.");
        }

        store.set(key, { bytes, contentType });
      },
      async get(key: string) {
        const entry = store.get(key);
        if (!entry) return null;

        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(entry.bytes);
              controller.close();
            },
          }),
          httpMetadata: {
            contentType: entry.contentType,
          },
          writeHttpMetadata(headers: Headers) {
            headers.set("content-type", entry.contentType);
          },
        };
      },
    },
  };
}

async function loadWorker() {
  const mod = await import("../workers/api/src/index");
  return mod.default;
}

test("GET /api/health reports D1 and R2 availability", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://sparkpost.test/api/health"), {
    SPARKPOST_DB: createFakeDb({
      user: {
        id: "user-1",
        email: "demo@example.com",
        createdAt: new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        creditBalance: 20,
      },
      creditBalance: 20,
      generatedTask: null,
      generatedAssetUrl: null,
    }),
    SPARKPOST_R2: createFakeR2().bucket,
  });
  const result = await readJsonResponse<{ ok: boolean; database: string; objectStorage: string }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.database, "configured");
  assert.equal(result.body.objectStorage, "configured");
});

test("POST /api/generate/image stores asset in R2 and returns Worker asset URL", async () => {
  const worker = await loadWorker();
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      creditBalance: 20,
    },
    creditBalance: 20,
    generatedTask: null,
    generatedAssetUrl: null,
  };
  const fakeR2 = createFakeR2();
  const secret = "workers-smoke-secret";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://api.openai.com/v1/images/generations") {
      return new Response(
        JSON.stringify({
          data: [
            {
              b64_json: Buffer.from("fake-image-binary", "utf8").toString("base64"),
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch in smoke test: ${url}`);
  };

  try {
    const session = createSessionToken(state.user.id, state.user.email, secret);
    const response = await worker.fetch(
      new Request("https://sparkpost.test/api/generate/image", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `sparkpost_session=${session}`,
        },
        body: JSON.stringify({ prompt: "a glass greenhouse on mars" }),
      }),
      {
        SPARKPOST_DB: createFakeDb(state),
        SPARKPOST_R2: fakeR2.bucket,
        SESSION_SECRET: secret,
        IMAGE_BACKEND: "official",
        IMAGE_MODEL: "dall-e-3",
        IMAGE_API_KEY: "test-key",
        IMAGE_BASE_URL: "https://api.openai.com/v1",
        TEXT_TO_IMAGE_COST: "10",
      },
    );

    const result = await readJsonResponse<{
      ok: boolean;
      task: {
        status: string;
        remainingCredits: number;
        assets: Array<{ fileUrl: string }>;
      };
    }>(response);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.task.status, "succeeded");
    assert.equal(result.body.task.remainingCredits, 10);
    assert.match(result.body.task.assets[0]?.fileUrl ?? "", /^https:\/\/sparkpost\.test\/api\/assets\/generated\//);
    assert.equal(fakeR2.store.size, 1);
    assert.equal(state.generatedAssetUrl, result.body.task.assets[0]?.fileUrl ?? null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/generate/image supports image-to-image requests", async () => {
  const worker = await loadWorker();
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      creditBalance: 20,
    },
    creditBalance: 20,
    generatedTask: null,
    generatedAssetUrl: null,
  };
  const fakeR2 = createFakeR2();
  const secret = "workers-smoke-secret";
  const originalFetch = globalThis.fetch;
  const referenceImage = "data:image/png;base64," + Buffer.from("source-image", "utf8").toString("base64");
  const styleReferenceImage = "data:image/png;base64," + Buffer.from("style-image", "utf8").toString("base64");

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://api.openai.com/v1/images/edits") {
      const request = input instanceof Request ? input : new Request(url, init);
      const formData = await request.formData();
      assert.equal(formData.get("model"), "dall-e-3");
      const compiledPrompt = formData.get("prompt");
      assert.equal(typeof compiledPrompt, "string");
      assert.match(String(compiledPrompt), /Reference guide:/);
      assert.match(String(compiledPrompt), /R1: Explicitly referenced by the user/i);
      assert.match(String(compiledPrompt), /R2: Explicitly referenced by the user/i);
      assert.match(String(compiledPrompt), /Use R2 as the dominant style, color, and rendering reference\./);
      assert.match(String(compiledPrompt), /Follow the pose, composition, or camera language from R2\./);
      assert.match(String(compiledPrompt), /Preserve the key identity, silhouette, and recognizable subject cues from R1\./);
      assert.match(String(compiledPrompt), /User intent:\r?\n参考@R2，将@R1换成@R2的风格姿势，并保留@R1的主体轮廓/);
      const files = formData.getAll("image");
      assert.equal(files.length, 2);
      const uploadedImage = files[0];
      assert.ok(uploadedImage instanceof File);
      assert.equal(uploadedImage.type, "image/png");
      assert.equal(await uploadedImage.text(), "source-image");
      const uploadedStyleImage = files[1];
      assert.ok(uploadedStyleImage instanceof File);
      assert.equal(uploadedStyleImage.type, "image/png");
      assert.equal(await uploadedStyleImage.text(), "style-image");
      return new Response(
        JSON.stringify({
          data: [
            {
              b64_json: Buffer.from("edited-image-binary", "utf8").toString("base64"),
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch in smoke test: ${url}`);
  };

  try {
    const session = createSessionToken(state.user.id, state.user.email, secret);
    const response = await worker.fetch(
      new Request("https://sparkpost.test/api/generate/image", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `sparkpost_session=${session}`,
        },
        body: JSON.stringify({
          mode: "i2i",
          prompt: "参考@R2，将@R1换成@R2的风格姿势，并保留@R1的主体轮廓",
          referenceImages: [referenceImage, styleReferenceImage],
        }),
      }),
      {
        SPARKPOST_DB: createFakeDb(state),
        SPARKPOST_R2: fakeR2.bucket,
        SESSION_SECRET: secret,
        IMAGE_API_KEY: "test-key",
      },
    );

    const result = await readJsonResponse<{ ok: boolean; task: GeneratedTask & { remainingCredits: number; assets: Array<{ fileUrl: string }> } }>(response);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.task.status, "succeeded");
    assert.equal(result.body.task.costCredits, 10);
    assert.equal(result.body.task.remainingCredits, 10);
    assert.equal(fakeR2.store.size, 1);
    assert.match(result.body.task.assets[0].fileUrl, /\/api\/assets\/generated\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/auth/dev-login returns session for seeded user", async () => {
  const worker = await loadWorker();
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: null,
      lastLoginAt: null,
      creditBalance: 20,
    },
    creditBalance: 20,
    generatedTask: null,
    generatedAssetUrl: null,
  };

  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/auth/dev-login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "demo@example.com" }),
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: "workers-smoke-secret",
      DEV_AUTH_DEBUG_CODE: "true",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    isNewUser: boolean;
    user: { email: string; creditBalance: number };
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.isNewUser, false);
  assert.equal(result.body.user.email, "demo@example.com");
  assert.equal(result.body.user.creditBalance, 20);
  assert.match(response.headers.get("set-cookie") ?? "", /sparkpost_session=/);
});

test("POST /api/auth/send-code sends verification email when debug mode is disabled", async () => {
  const worker = await loadWorker();
  const verificationDb = createVerificationDb();
  const originalFetch = globalThis.fetch;
  const sentRequests: Array<{ url: string; body: Record<string, unknown> }> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://api.resend.com/emails") {
      sentRequests.push({
        url,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      });

      return new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch in send-code smoke test: ${url}`);
  };

  try {
    const response = await worker.fetch(
      new Request("https://sparkpost.test/api/auth/send-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "demo@example.com" }),
      }),
      {
        SPARKPOST_DB: verificationDb.db,
        SESSION_SECRET: "workers-smoke-secret",
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "SparkPost <no-reply@example.com>",
        EMAIL_SUBJECT_PREFIX: "[SparkPost]",
        RESEND_API_KEY: "resend_test_key",
      },
    );

    const result = await readJsonResponse<{ ok: boolean; email: string; expiresAt: string; debugCode?: string }>(response);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.email, "demo@example.com");
    assert.equal(result.body.debugCode, undefined);
    assert.equal(verificationDb.insertedCodes.length, 1);
    assert.equal(sentRequests.length, 1);
    assert.equal(sentRequests[0]?.body.from, "SparkPost <no-reply@example.com>");
    assert.deepEqual(sentRequests[0]?.body.to, ["demo@example.com"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/assets/* returns stored image bytes from R2", async () => {
  const worker = await loadWorker();
  const fakeR2 = createFakeR2();
  const key = "generated/user-1/task-1/asset-1.png";
  await fakeR2.bucket.put(key, new TextEncoder().encode("binary-image"), {
    httpMetadata: { contentType: "image/png" },
  });

  const response = await worker.fetch(
    new Request(`https://sparkpost.test/api/assets/${key}`),
    {
      SPARKPOST_R2: fakeR2.bucket,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(await response.text(), "binary-image");
});
