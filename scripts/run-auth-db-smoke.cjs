/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const prismaDir = path.join(rootDir, "prisma");

function loadEnvFile(filename) {
  if (!fs.existsSync(filename)) {
    return;
  }

  const source = fs.readFileSync(filename, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.local"));

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.DEV_AUTH_DEBUG_CODE = process.env.DEV_AUTH_DEBUG_CODE || "true";

function resolveAppModule(specifier) {
  if (specifier.startsWith("@/")) {
    const candidate = path.join(srcDir, specifier.slice(2));
    if (path.extname(candidate)) {
      return candidate;
    }

    if (fs.existsSync(`${candidate}.ts`)) {
      return `${candidate}.ts`;
    }

    if (fs.existsSync(`${candidate}.tsx`)) {
      return `${candidate}.tsx`;
    }

    return `${candidate}.ts`;
  }

  if (path.isAbsolute(specifier)) {
    return specifier;
  }

  return require.resolve(specifier, { paths: [rootDir] });
}

function installTsHook() {
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      return resolveAppModule(request);
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  const transpile = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    });

    module._compile(output.outputText, filename);
  };

  Module._extensions[".ts"] = transpile;
  Module._extensions[".tsx"] = transpile;
}

function jsonRequest(url, body, headers = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readJsonResponse(response) {
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

function getCookieHeader(setCookie) {
  if (!setCookie) {
    return null;
  }

  return setCookie.split(";")[0] ?? null;
}

function getSchemaApplyCommand() {
  const migrationsDir = path.join(prismaDir, "migrations");
  return fs.existsSync(migrationsDir) ? "npx prisma migrate dev" : "npx prisma db push";
}

async function assertRequiredSchema(prisma) {
  const requiredTables = ["users", "email_verification_codes", "credit_accounts"];
  const rows = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()",
  );
  const existingTables = new Set(rows.map((row) => row.tablename));
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      `Database is reachable, but the current schema is missing required tables: ${missingTables.join(", ")}. Apply the Prisma schema first with ${getSchemaApplyCommand()}.`,
    );
  }
}

async function cleanupAuthArtifacts(prisma, email) {
  await prisma.emailVerificationCode.deleteMany({
    where: {
      email,
    },
  });

  await prisma.user.deleteMany({
    where: {
      email,
    },
  });
}

installTsHook();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL is required for the real-db auth smoke test. Set it to a PostgreSQL database in your shell or env file, apply the schema with ${getSchemaApplyCommand()}, then rerun npm run test:auth:db.`,
    );
  }

  const { prisma } = require(resolveAppModule("@/lib/prisma"));
  const sendCodeRoute = require(resolveAppModule("@/app/api/auth/send-code/route"));
  const verifyCodeRoute = require(resolveAppModule("@/app/api/auth/verify-code/route"));
  const meRoute = require(resolveAppModule("@/app/api/me/route"));

  const email = `auth-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const forwardedFor = "203.0.113.200";

  try {
    await prisma.$connect();
    await assertRequiredSchema(prisma);
    await cleanupAuthArtifacts(prisma, email);

    const sendCodeResponse = await sendCodeRoute.POST(
      jsonRequest("http://localhost/api/auth/send-code", { email }),
    );
    const sendCode = await readJsonResponse(sendCodeResponse);

    assert.equal(sendCode.status, 200, `send-code should return 200, got ${sendCode.status}`);
    assert.equal(sendCode.body?.ok, true, "send-code should return ok: true");
    assert.equal(sendCode.body?.email, email, "send-code should normalize and echo email");
    assert.equal(typeof sendCode.body?.expiresAt, "string", "send-code should return expiresAt");
    assert.match(
      String(sendCode.body?.debugCode ?? ""),
      /^\d{6}$/,
      "send-code should expose debugCode in development smoke mode",
    );

    const verifyCodeResponse = await verifyCodeRoute.POST(
      jsonRequest(
        "http://localhost/api/auth/verify-code",
        {
          email,
          code: sendCode.body.debugCode,
        },
        {
          "x-forwarded-for": forwardedFor,
        },
      ),
    );
    const verifyCode = await readJsonResponse(verifyCodeResponse);

    assert.equal(verifyCode.status, 200, `verify-code should return 200, got ${verifyCode.status}`);
    assert.equal(verifyCode.body?.ok, true, "verify-code should return ok: true");
    assert.equal(typeof verifyCode.body?.isNewUser, "boolean", "verify-code should return isNewUser");
    assert.equal(verifyCode.body?.user?.email, email, "verify-code should return authenticated user email");
    assert.equal(
      typeof verifyCode.body?.user?.creditBalance,
      "number",
      "verify-code should return user.creditBalance",
    );

    const cookieHeader = getCookieHeader(verifyCode.headers.get("set-cookie"));
    assert.ok(cookieHeader, "verify-code should set a session cookie");

    const meResponse = await meRoute.GET(
      new Request("http://localhost/api/me", {
        headers: {
          cookie: cookieHeader,
        },
      }),
    );
    const me = await readJsonResponse(meResponse);

    assert.equal(me.status, 200, `/api/me should return 200, got ${me.status}`);
    assert.equal(me.body?.user?.email, email, "/api/me should resolve the authenticated user");
    assert.equal(typeof me.body?.user?.id, "string", "/api/me should return user.id");

    console.log("Real-db auth smoke passed");
    console.log(JSON.stringify({ email, isNewUser: verifyCode.body.isNewUser }, null, 2));
  } finally {
    try {
      await cleanupAuthArtifacts(prisma, email);
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error("Real-db auth smoke failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
