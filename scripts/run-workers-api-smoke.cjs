/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const testsDir = path.join(rootDir, "tests");

function registerTsExtension(extension) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
      fileName: filename,
    });

    module._compile(output.outputText, filename);
  };
}

registerTsExtension(".ts");
registerTsExtension(".tsx");

async function readJsonResponse(response) {
  const body = await response.json();
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

globalThis.readJsonResponse = readJsonResponse;

const tests = [];
globalThis.test = (name, fn) => {
  tests.push({ name, fn });
};

require(path.join(testsDir, "workers-api.test.ts"));

(async () => {
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`Workers API smoke tests failed: ${failed}`);
  } else {
    console.log(`Workers API smoke tests passed: ${tests.length}`);
  }
})();
