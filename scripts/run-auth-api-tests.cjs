/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const testsDir = path.join(rootDir, "tests");
const srcDir = path.join(rootDir, "src");

process.env.NODE_ENV = "development";
process.env.DEV_AUTH_DEBUG_CODE = "true";

globalThis.__moduleMocks = new Map();

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

function shouldClearCache(filename) {
  const normalized = filename.split(path.sep).join(path.sep);
  return (
    normalized.startsWith(path.join(srcDir, "app", "api")) ||
    normalized === path.join(srcDir, "lib", "auth", "service.ts") ||
    normalized === path.join(srcDir, "lib", "auth", "user.ts") ||
    normalized === path.join(srcDir, "lib", "prisma.ts")
  );
}

function clearAppModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (shouldClearCache(filename)) {
      delete require.cache[filename];
    }
  }
}

function installTsHook() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

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

  Module._load = function load(request, parent, isMain) {
    const filename = Module._resolveFilename(request, parent, isMain);
    const mocks = globalThis.__moduleMocks;
    if (mocks && mocks.has(filename)) {
      return mocks.get(filename);
    }

    return originalLoad.call(this, request, parent, isMain);
  };
}

async function withMockedModules(mocks, fn) {
  const registry = globalThis.__moduleMocks;
  const normalizedMocks = Object.entries(mocks).map(([specifier, mock]) => [
    resolveAppModule(specifier),
    mock,
  ]);
  const previousValues = new Map();

  for (const [filename, mock] of normalizedMocks) {
    previousValues.set(filename, registry.has(filename) ? registry.get(filename) : undefined);
    registry.set(filename, mock);
  }

  clearAppModuleCache();

  try {
    return await fn();
  } finally {
    for (const [filename, previousValue] of previousValues) {
      if (previousValue === undefined) {
        registry.delete(filename);
      } else {
        registry.set(filename, previousValue);
      }
    }

    clearAppModuleCache();
  }
}

async function withFrozenTime(initialNow, fn) {
  const OriginalDate = Date;
  let now = initialNow;

  class FakeDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(now);
        return;
      }

      super(...args);
    }

    static now() {
      return now;
    }
  }

  FakeDate.parse = OriginalDate.parse;
  FakeDate.UTC = OriginalDate.UTC;
  FakeDate.prototype = OriginalDate.prototype;
  globalThis.Date = FakeDate;

  try {
    return await fn({
      now: () => now,
      setNow(nextNow) {
        now = nextNow;
      },
    });
  } finally {
    globalThis.Date = OriginalDate;
  }
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
  const body = await response.json();
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

installTsHook();

globalThis.resolveAppModule = resolveAppModule;
globalThis.clearAppModuleCache = clearAppModuleCache;
globalThis.withMockedModules = withMockedModules;
globalThis.withFrozenTime = withFrozenTime;
globalThis.jsonRequest = jsonRequest;
globalThis.readJsonResponse = readJsonResponse;

const tests = [];
globalThis.test = (name, fn) => {
  tests.push({ name, fn });
};

require(path.join(testsDir, "auth-api.test.ts"));

(async () => {
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`Auth API tests failed: ${failed}`);
  } else {
    console.log(`Auth API tests passed: ${tests.length}`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
