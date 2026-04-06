/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const testsDir = path.join(rootDir, "tests");
const srcDir = path.join(rootDir, "src");

process.env.NODE_ENV = "development";

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

function clearAppModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (
      filename.startsWith(path.join(srcDir, "app", "api")) ||
      filename.startsWith(path.join(srcDir, "lib", "image")) ||
      filename.startsWith(path.join(srcDir, "lib", "auth")) ||
      filename === path.join(srcDir, "lib", "prisma.ts")
    ) {
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

async function readJsonResponse(response) {
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
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

installTsHook();

globalThis.resolveAppModule = resolveAppModule;
globalThis.withMockedModules = withMockedModules;
globalThis.readJsonResponse = readJsonResponse;
globalThis.jsonRequest = jsonRequest;

const tests = [];
globalThis.test = (name, fn) => {
  tests.push({ name, fn });
};

require(path.join(testsDir, "image-generation.test.ts"));

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
    console.error(`Image generation tests failed: ${failed}`);
  } else {
    console.log(`Image generation tests passed: ${tests.length}`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
