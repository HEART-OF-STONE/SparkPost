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
  requestedSize?: string | null;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
};

type FakeCreditTransaction = {
  id: string;
  type: string;
  sourceType?: string | null;
  amount: number;
  balanceAfter: number;
  remainingAmount?: number | null;
  expiresAt?: string | null;
  packageCode?: string | null;
  paymentProvider?: string | null;
  paymentSessionId?: string | null;
  remark: string | null;
  createdAt: string;
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
  hasCheckedInToday?: boolean;
  creditTransactions?: FakeCreditTransaction[];
  generationHistory?: Array<{
    id: string;
    taskType: string;
    status: string;
    prompt: string;
    requestedSize?: string | null;
    model: string | null;
    costCredits: number;
    errorMessage?: string | null;
    createdAt: string;
    completedAt: string | null;
    assets: Array<{
      id: string;
      fileUrl: string;
      width: number | null;
      height: number | null;
      createdAt: string;
    }>;
  }>;
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

function createPngBytes(width: number, height: number) {
  const bytes = Buffer.alloc(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
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

              if (sql.includes("FROM daily_check_ins")) {
                return state.hasCheckedInToday ? ({ id: "checkin-1" } as T) : null;
              }

              if (sql.includes("FROM generation_tasks WHERE id = ? LIMIT 1")) {
                return state.generatedTask as T;
              }

              return null;
            },
            async all<T>() {
              if (sql.includes("COALESCE(remaining_amount") && sql.includes("FROM credit_transactions") && sql.includes("ORDER BY expires_at")) {
                const userId = String(values[0]);
                const expiresAt = values.length > 1 ? String(values[1]) : null;
                const results = (state.creditTransactions ?? [])
                  .filter(() => userId === state.user.id)
                  .filter((item) => item.amount > 0)
                  .map((item) => ({
                    id: item.id,
                    type: item.type,
                    sourceType: item.sourceType ?? null,
                    remainingAmount: item.remainingAmount ?? item.amount,
                    expiresAt: item.expiresAt ?? null,
                    createdAt: item.createdAt,
                  }))
                  .filter((item) => item.remainingAmount > 0)
                  .filter((item) => {
                    if (!sql.includes("expires_at IS NOT NULL")) return true;
                    return (
                      Boolean(item.expiresAt) &&
                      new Date(item.expiresAt!).getTime() <= new Date(expiresAt ?? "").getTime()
                    );
                  });

                return { results: results as T[] };
              }

              if (sql.includes("FROM credit_transactions")) {
                return {
                  results: (state.creditTransactions ?? []).map((item) => ({
                    ...item,
                    sourceType: item.sourceType ?? null,
                    remainingAmount: item.remainingAmount ?? (item.amount > 0 ? item.amount : null),
                    expiresAt: item.expiresAt ?? null,
                    packageCode: item.packageCode ?? null,
                    paymentProvider: item.paymentProvider ?? null,
                    paymentSessionId: item.paymentSessionId ?? null,
                  })) as T[],
                };
              }

              if (sql.includes("FROM generation_tasks") && sql.includes("LEFT JOIN generated_assets")) {
                const userId = String(values[0]);
                const limit = Number(values[1]);
                const rows: Array<{
                  id: string;
                  taskType: string;
                  status: string;
                  prompt: string;
                  requestedSize: string | null;
                  model: string | null;
                  costCredits: number;
                  errorMessage: string | null;
                  createdAt: string;
                  completedAt: string | null;
                  assetId: string | null;
                  fileUrl: string | null;
                  width: number | null;
                  height: number | null;
                  assetCreatedAt: string | null;
                }> = [];

                for (const item of (state.generationHistory ?? [])
                  .filter(() => userId === state.user.id)
                  .slice(0, Number.isFinite(limit) ? limit : 24)) {
                  if (item.assets.length > 0) {
                    for (const asset of item.assets) {
                      rows.push({
                          id: item.id,
                          taskType: item.taskType,
                          status: item.status,
                          prompt: item.prompt,
                          requestedSize: item.requestedSize ?? null,
                          model: item.model,
                          costCredits: item.costCredits,
                          errorMessage: item.errorMessage ?? null,
                          createdAt: item.createdAt,
                          completedAt: item.completedAt,
                          assetId: asset.id,
                          fileUrl: asset.fileUrl,
                          width: asset.width,
                          height: asset.height,
                          assetCreatedAt: asset.createdAt,
                      });
                    }
                  } else {
                    rows.push({
                          id: item.id,
                          taskType: item.taskType,
                          status: item.status,
                          prompt: item.prompt,
                          requestedSize: item.requestedSize ?? null,
                          model: item.model,
                          costCredits: item.costCredits,
                          errorMessage: item.errorMessage ?? null,
                          createdAt: item.createdAt,
                          completedAt: item.completedAt,
                          assetId: null,
                          fileUrl: null,
                          width: null,
                          height: null,
                          assetCreatedAt: null,
                    });
                  }
                }

                return { results: rows as T[] };
              }

              return { results: [] as T[] };
            },
              async run(): Promise<D1RunResult> {
                if (sql.includes("UPDATE credit_transactions SET remaining_amount = ? WHERE id = ?")) {
                  const nextRemainingAmount =
                    values[0] == null ? null : Number(values[0]);
                  const transactionId = String(values[1]);
                  state.creditTransactions = (state.creditTransactions ?? []).map((item) =>
                    item.id === transactionId
                      ? {
                          ...item,
                          remainingAmount: nextRemainingAmount,
                        }
                      : item,
                  );
                  return { meta: { changes: 1 } };
                }

                if (sql.includes("INSERT INTO generation_tasks")) {
                  const includesCompiledPrompt = sql.includes("compiled_prompt");
                  const includesRequestedSize = sql.includes("requested_size");
                  const promptIndex = 2;
                  const requestedSizeIndex = includesCompiledPrompt && includesRequestedSize ? 4 : null;
                  const modelIndex = includesCompiledPrompt ? (includesRequestedSize ? 5 : 4) : 3;
                  const costIndex = includesCompiledPrompt ? (includesRequestedSize ? 6 : 5) : 4;
                  const createdAtIndex = includesCompiledPrompt
                    ? sql.includes("input_image_url")
                      ? (includesRequestedSize ? 8 : 7)
                      : (includesRequestedSize ? 7 : 6)
                    : 5;
                  state.generatedTask = {
                    id: String(values[0]),
                    status: "running",
                    prompt: String(values[promptIndex]),
                    requestedSize: requestedSizeIndex === null ? null : String(values[requestedSizeIndex]),
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
                const nextTransaction: FakeCreditTransaction = {
                  id: String(values[0]),
                  type: String(values[2]),
                  sourceType: (values[3] as string | null) ?? null,
                  amount: Number(values[4]),
                  balanceAfter: Number(values[5]),
                  remainingAmount:
                    values[6] == null ? null : Number(values[6]),
                  expiresAt: typeof values[7] === "string" ? String(values[7]) : null,
                  packageCode: typeof values[9] === "string" ? String(values[9]) : null,
                  paymentProvider: typeof values[10] === "string" ? String(values[10]) : null,
                  paymentSessionId: typeof values[11] === "string" ? String(values[11]) : null,
                  remark: typeof values[12] === "string" ? String(values[12]) : null,
                  createdAt: String(values[13]),
                };
                state.creditTransactions = [nextTransaction, ...(state.creditTransactions ?? [])];
                return { meta: { changes: 1 } };
              }

              if (sql.includes("INSERT INTO daily_check_ins")) {
                state.hasCheckedInToday = true;
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
            async all<T>() {
              return { results: [] as T[] };
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
      hasCheckedInToday: false,
      creditTransactions: [],
    }),
    SPARKPOST_R2: createFakeR2().bucket,
  });
  const result = await readJsonResponse<{ ok: boolean; database: string; objectStorage: string }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.database, "configured");
  assert.equal(result.body.objectStorage, "configured");
});

test("GET /api/models/image returns registered image models", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("https://sparkpost.test/api/models/image"), {
    IMAGE_DEFAULT_MODEL_ID: "gpt-image-2",
    TEXT_TO_IMAGE_COST: "10",
    IMAGE_TO_IMAGE_COST: "15",
  });
  const result = await readJsonResponse<{
    ok: boolean;
    defaultModelId: string;
    items: Array<{
      id: string;
      label: string;
      provider: string;
      model: string;
      isDefault: boolean;
      supportedSizes: string[];
      defaultSize: string;
      costCredits: { t2i: number | null; i2i: number | null };
    }>;
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.defaultModelId, "gpt-image-2");
  assert.ok(result.body.items.some((item) => item.id === "gpt-image-2" && item.provider === "relay" && item.model === "gpt-image2" && item.isDefault));
  assert.deepEqual(result.body.items.find((item) => item.id === "gpt-image-2")?.supportedSizes, [
    "auto",
    "1024x1024",
    "1536x1024",
    "1024x1536",
    "2048x2048",
    "2048x1152",
    "3840x2160",
    "2160x3840",
  ]);
  assert.equal(result.body.items.find((item) => item.id === "gpt-image-2")?.defaultSize, "auto");
  assert.deepEqual(result.body.items.find((item) => item.id === "gpt-image-2")?.costCredits, {
    t2i: 10,
    i2i: 15,
  });
  assert.deepEqual(result.body.items.find((item) => item.id === "dall-e-3")?.costCredits, {
    t2i: 10,
    i2i: null,
  });
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
    hasCheckedInToday: false,
    creditTransactions: [
      {
        id: "tx-signup",
        type: "signup_bonus",
        sourceType: "signup",
        amount: 20,
        balanceAfter: 20,
        remainingAmount: 20,
        remark: "Signup bonus",
        createdAt: new Date().toISOString(),
      },
    ],
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

test("POST /api/generate/image can target the default duojie GPT-Image relay model via modelId", async () => {
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
    hasCheckedInToday: false,
    creditTransactions: [
      {
        id: "tx-signup",
        type: "signup_bonus",
        sourceType: "signup",
        amount: 20,
        balanceAfter: 20,
        remainingAmount: 20,
        remark: "Signup bonus",
        createdAt: new Date().toISOString(),
      },
    ],
  };
  const fakeR2 = createFakeR2();
  const secret = "workers-smoke-secret";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://duojie.example.com/v1/images/generations") {
      const request = input instanceof Request ? input : new Request(url, init);
      const payload = await request.json() as { model?: string; prompt?: string; quality?: string; size?: string };
      assert.equal(request.headers.get("authorization"), "Bearer duojie-test-key");
      assert.equal(payload.model, "gpt-image2");
      assert.equal(typeof payload.prompt, "string");
      assert.equal(payload.size, "1536x1024");
      assert.equal(payload.quality, "high");
      return new Response(
        JSON.stringify({
          data: [
            {
              b64_json: createPngBytes(1536, 1024).toString("base64"),
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
          modelId: "gpt-image-2",
          prompt: "a premium product render with sharp reflections",
          size: "1536x1024",
        }),
      }),
      {
        SPARKPOST_DB: createFakeDb(state),
        SPARKPOST_R2: fakeR2.bucket,
        SESSION_SECRET: secret,
        RELAY_IMAGE_API_KEY: "duojie-test-key",
        RELAY_IMAGE_BASE_URL: "https://duojie.example.com/v1",
        TEXT_TO_IMAGE_COST: "10",
      },
    );

    const result = await readJsonResponse<{
      ok: boolean;
      task: {
        status: string;
        model: string | null;
        requestedSize: string | null;
        remainingCredits: number;
        assets: Array<{ width: number | null; height: number | null }>;
      };
    }>(response);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.task.status, "succeeded");
    assert.equal(result.body.task.model, "gpt-image2");
    assert.equal(result.body.task.requestedSize, "1536x1024");
    assert.equal(result.body.task.remainingCredits, 10);
    assert.equal(result.body.task.assets[0]?.width, 1536);
    assert.equal(result.body.task.assets[0]?.height, 1024);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/generations/history returns private generation records", async () => {
  const worker = await loadWorker();
  const createdAt = new Date().toISOString();
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt,
      emailVerifiedAt: createdAt,
      lastLoginAt: createdAt,
      creditBalance: 20,
    },
    creditBalance: 20,
    generatedTask: null,
    generatedAssetUrl: null,
    hasCheckedInToday: false,
    creditTransactions: [],
    generationHistory: [
      {
        id: "task-1",
        taskType: "text_to_image",
        status: "succeeded",
        prompt: "a luminous glass observatory",
        requestedSize: "1536x1024",
        model: "gpt-image-2",
        costCredits: 10,
        errorMessage: null,
        createdAt,
        completedAt: createdAt,
        assets: [
          {
            id: "asset-1",
            fileUrl: "https://sparkpost.test/api/assets/generated/user-1/task-1/asset.png",
            width: 1536,
            height: 1024,
            createdAt,
          },
        ],
      },
    ],
  };
  const secret = "workers-smoke-secret";
  const session = createSessionToken(state.user.id, state.user.email, secret);

  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/generations/history?limit=10", {
      headers: {
        cookie: `sparkpost_session=${session}`,
      },
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    items: Array<{
      id: string;
      prompt: string;
      requestedSize: string | null;
      model: string | null;
      assets: Array<{ fileUrl: string; width: number | null; height: number | null }>;
    }>;
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.items.length, 1);
  assert.equal(result.body.items[0]?.id, "task-1");
  assert.equal(result.body.items[0]?.prompt, "a luminous glass observatory");
  assert.equal(result.body.items[0]?.requestedSize, "1536x1024");
  assert.equal(result.body.items[0]?.model, "gpt-image-2");
  assert.equal(result.body.items[0]?.assets[0]?.width, 1536);
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
    hasCheckedInToday: false,
    creditTransactions: [
      {
        id: "tx-signup",
        type: "signup_bonus",
        sourceType: "signup",
        amount: 20,
        balanceAfter: 20,
        remainingAmount: 20,
        remark: "Signup bonus",
        createdAt: new Date().toISOString(),
      },
    ],
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
      assert.equal(formData.get("model"), "gemini-3.1-flash-image-openai");
      const compiledPrompt = formData.get("prompt");
      assert.equal(typeof compiledPrompt, "string");
      assert.match(String(compiledPrompt), /Reference guide:/);
      assert.match(String(compiledPrompt), /R1: Explicitly referenced by the user/i);
      assert.match(String(compiledPrompt), /R2: Explicitly referenced by the user/i);
      assert.match(String(compiledPrompt), /Use R2 as the dominant style, color, and rendering reference\./);
      assert.match(String(compiledPrompt), /Follow the pose, composition, or camera language from R2\./);
      assert.match(String(compiledPrompt), /Preserve the key identity, silhouette, and recognizable subject cues from R1\./);
      assert.match(String(compiledPrompt), /User intent:\r?\n参考@R2，将@R1换成@R2的风格姿势，并保留@R1的主体轮廓/);
      assert.equal(formData.get("size"), "1024x1536");
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
          size: "1024x1536",
          referenceImages: [referenceImage, styleReferenceImage],
        }),
      }),
      {
        SPARKPOST_DB: createFakeDb(state),
        SPARKPOST_R2: fakeR2.bucket,
        SESSION_SECRET: secret,
        IMAGE_DEFAULT_MODEL_ID: "nano-banana-2",
        RELAY_IMAGE_API_KEY: "relay-test-key",
        RELAY_IMAGE_BASE_URL: "https://api.openai.com/v1",
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
    hasCheckedInToday: false,
    creditTransactions: [],
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

test("GET /api/credits/summary returns balance and check-in state", async () => {
  const worker = await loadWorker();
  const secret = "workers-smoke-secret";
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      creditBalance: 35,
    },
    creditBalance: 35,
    generatedTask: null,
    generatedAssetUrl: null,
    hasCheckedInToday: false,
    creditTransactions: [
      {
        id: "tx-1",
        type: "text_to_image",
        amount: -10,
        balanceAfter: 35,
        remark: "Prompt A",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const session = createSessionToken(state.user.id, state.user.email, secret);
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/credits/summary", {
      headers: {
        cookie: `sparkpost_session=${session}`,
      },
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
      DAILY_CHECK_IN_CREDITS: "20",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    creditBalance: number;
    hasCheckedInToday: boolean;
    dailyCheckInCredits: number;
    usageLast7Days: number[];
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.creditBalance, 35);
  assert.equal(result.body.hasCheckedInToday, false);
  assert.equal(result.body.dailyCheckInCredits, 20);
  assert.equal(result.body.usageLast7Days.length, 7);
});

test("GET /api/bootstrap returns public startup data without a session", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/bootstrap?locale=en"),
    {
      IMAGE_DEFAULT_MODEL_ID: "nano-banana-2",
      RELAY_IMAGE_API_KEY: "relay-test-key",
      RELAY_IMAGE_BASE_URL: "https://relay.example/v1",
      RELAY_IMAGE_API_KEY_MICU: "micu-test-key",
      RELAY_IMAGE_BASE_URL_MICU: "https://micu.example/v1",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    user: null;
    creditSummary: null;
    recentCreditHistory: unknown[];
    imageStatus: { status: string; modelId: string };
    imageModels: { ok: boolean; items: unknown[] };
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.user, null);
  assert.equal(result.body.creditSummary, null);
  assert.deepEqual(result.body.recentCreditHistory, []);
  assert.equal(result.body.imageStatus.modelId, "nano-banana-2");
  assert.equal(result.body.imageModels.ok, true);
  assert.equal(result.body.imageModels.items.length, 3);
});

test("GET /api/bootstrap returns authenticated startup data in one response", async () => {
  const worker = await loadWorker();
  const secret = "workers-smoke-secret";
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      creditBalance: 35,
    },
    creditBalance: 35,
    generatedTask: null,
    generatedAssetUrl: null,
    hasCheckedInToday: true,
    creditTransactions: [
      {
        id: "tx-1",
        type: "daily_check_in",
        amount: 20,
        balanceAfter: 35,
        remark: "Daily check-in",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tx-2",
        type: "text_to_image",
        amount: -10,
        balanceAfter: 15,
        remark: "Prompt A",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const session = createSessionToken(state.user.id, state.user.email, secret);
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/bootstrap?locale=en", {
      headers: {
        cookie: `sparkpost_session=${session}`,
      },
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
      DAILY_CHECK_IN_CREDITS: "20",
      IMAGE_DEFAULT_MODEL_ID: "nano-banana-2",
      RELAY_IMAGE_API_KEY: "relay-test-key",
      RELAY_IMAGE_BASE_URL: "https://relay.example/v1",
      RELAY_IMAGE_API_KEY_MICU: "micu-test-key",
      RELAY_IMAGE_BASE_URL_MICU: "https://micu.example/v1",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    user: { email: string; creditBalance: number };
    creditSummary: { creditBalance: number; hasCheckedInToday: boolean; usageLast7Days: number[] };
    recentCreditHistory: Array<{ id: string; type: string; amount: number }>;
    imageStatus: { status: string; modelId: string };
    imageModels: { ok: boolean; items: unknown[] };
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.user.email, "demo@example.com");
  assert.equal(result.body.user.creditBalance, 35);
  assert.equal(result.body.creditSummary.creditBalance, 35);
  assert.equal(result.body.creditSummary.hasCheckedInToday, true);
  assert.equal(result.body.creditSummary.usageLast7Days.length, 7);
  assert.equal(result.body.recentCreditHistory.length, 2);
  assert.equal(result.body.imageStatus.modelId, "nano-banana-2");
  assert.equal(result.body.imageModels.items.length, 3);
});

test("POST /api/credits/check-in awards credits once per day", async () => {
  const worker = await loadWorker();
  const secret = "workers-smoke-secret";
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
    hasCheckedInToday: false,
    creditTransactions: [],
  };

  const session = createSessionToken(state.user.id, state.user.email, secret);
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/credits/check-in", {
      method: "POST",
      headers: {
        cookie: `sparkpost_session=${session}`,
      },
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
      DAILY_CHECK_IN_CREDITS: "20",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    awardedCredits: number;
    creditBalance: number;
    hasCheckedInToday: boolean;
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.awardedCredits, 20);
  assert.equal(result.body.creditBalance, 40);
  assert.equal(result.body.hasCheckedInToday, true);
});

test("GET /api/credits/summary expires stale daily check-in credits on the server", async () => {
  const worker = await loadWorker();
  const secret = "workers-smoke-secret";
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const state: FakeState = {
    user: {
      id: "user-1",
      email: "demo@example.com",
      createdAt: new Date().toISOString(),
      emailVerifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      creditBalance: 40,
    },
    creditBalance: 40,
    generatedTask: null,
    generatedAssetUrl: null,
    hasCheckedInToday: false,
    creditTransactions: [
      {
        id: "tx-expired",
        type: "daily_check_in",
        sourceType: "check_in",
        amount: 20,
        balanceAfter: 20,
        remainingAmount: 20,
        expiresAt: eightDaysAgo,
        remark: "Daily check-in",
        createdAt: eightDaysAgo,
      },
      {
        id: "tx-valid",
        type: "daily_check_in",
        sourceType: "check_in",
        amount: 20,
        balanceAfter: 40,
        remainingAmount: 20,
        expiresAt: tomorrow,
        remark: "Daily check-in",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const session = createSessionToken(state.user.id, state.user.email, secret);
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/credits/summary", {
      headers: {
        cookie: `sparkpost_session=${session}`,
      },
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
      DAILY_CHECK_IN_CREDITS: "20",
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    creditBalance: number;
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.creditBalance, 20);
});

test("POST /api/credits/topup/checkout returns placeholder checkout payload", async () => {
  const worker = await loadWorker();
  const secret = "workers-smoke-secret";
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
    hasCheckedInToday: false,
    creditTransactions: [],
  };

  const session = createSessionToken(state.user.id, state.user.email, secret);
  const response = await worker.fetch(
    new Request("https://sparkpost.test/api/credits/topup/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `sparkpost_session=${session}`,
      },
      body: JSON.stringify({ packageCode: "creator_pack", paymentProvider: "stripe" }),
    }),
    {
      SPARKPOST_DB: createFakeDb(state),
      SESSION_SECRET: secret,
    },
  );

  const result = await readJsonResponse<{
    ok: boolean;
    status: string;
    package: { code: string; credits: number };
    checkoutRequest: { paymentProvider: string };
  }>(response);

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.status, "pending_provider_integration");
  assert.equal(result.body.package.code, "creator_pack");
  assert.equal(result.body.package.credits, 1200);
  assert.equal(result.body.checkoutRequest.paymentProvider, "stripe");
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

test("POST /api/prompt/inspire returns provider prompt text", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://api.deepseek.com/v1/chat/completions") {
      const request = input instanceof Request ? input : new Request(url, init);
      const body = (await request.json()) as {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
      assert.equal(body.model, "deepseek-chat");
      assert.equal(body.messages[0]?.role, "system");
      assert.equal(body.messages[1]?.role, "user");
      assert.match(body.messages[1]?.content ?? "", /Task:\s*\nCreate a stronger text-to-image prompt/i);
      assert.match(body.messages[1]?.content ?? "", /User input:\s*\n科技产品海报/);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "A moody cinematic portrait with rain-soaked neon reflections and restrained contrast.",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch in prompt inspire smoke test: ${url}`);
  };

  try {
    const response = await worker.fetch(
      new Request("https://sparkpost.test/api/prompt/inspire", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "t2i",
          prompt: "科技产品海报",
        }),
      }),
      {
        DEEPSEEK_API_KEY: "deepseek-test-key",
      },
    );

    const result = await readJsonResponse<{ ok: boolean; prompt: string; provider: string; model: string }>(response);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.provider, "deepseek");
    assert.equal(result.body.model, "deepseek-chat");
    assert.match(result.body.prompt, /cinematic portrait/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/prompt/enhance returns rewritten prompt text", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://minimax.example.com/v1/chat/completions") {
      const request = input instanceof Request ? input : new Request(url, init);
      const body = (await request.json()) as {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
      assert.equal(body.model, "MiniMax-Text-01");
      assert.match(body.messages[1]?.content ?? "", /Task:\s*\nRewrite the user's image-to-image prompt/i);
      assert.match(body.messages[1]?.content ?? "", /keep @R# markers intact/i);
      assert.match(body.messages[1]?.content ?? "", /User input:\s*\n将@R1 的人物替换@R2的人物/);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Preserve @R1 as the main subject and replace the character styling with the identity cues from @R2.",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch in prompt enhance smoke test: ${url}`);
  };

  try {
    const response = await worker.fetch(
      new Request("https://sparkpost.test/api/prompt/enhance", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          mode: "i2i",
          prompt: "将@R1 的人物替换@R2的人物",
        }),
      }),
      {
        MINIMAX_API_KEY: "minimax-test-key",
        MINIMAX_BASE_URL: "https://minimax.example.com/v1",
      },
    );

    const result = await readJsonResponse<{ ok: boolean; prompt: string; provider: string; model: string }>(response);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.provider, "minimax");
    assert.equal(result.body.model, "MiniMax-Text-01");
    assert.match(result.body.prompt, /Preserve @R1/i);
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

test("POST protected API routes reject disallowed browser origins", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://api.776607.xyz/api/prompt/inspire", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({
        mode: "t2i",
        prompt: "A test prompt",
      }),
    }),
    {
      ALLOWED_ORIGINS: "https://776607.xyz,https://sparkpost.pages.dev",
      DEEPSEEK_API_KEY: "deepseek-test-key",
      DEEPSEEK_BASE_URL: "https://deepseek.example.com/v1",
    },
  );

  const result = await readJsonResponse<{ error: string }>(response);
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Forbidden origin.");
});
