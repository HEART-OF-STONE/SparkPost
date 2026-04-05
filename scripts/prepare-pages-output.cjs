const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const openNextDir = path.join(rootDir, ".open-next");
const pagesDir = path.join(rootDir, ".pages");
const assetsDir = path.join(openNextDir, "assets");
const workerEntry = path.join(openNextDir, "worker.js");
const wrappedWorkerEntry = path.join(pagesDir, "_worker.js");

if (!fs.existsSync(workerEntry)) {
  throw new Error(
    "Missing .open-next/worker.js. Run the OpenNext build before preparing the Pages output.",
  );
}

if (!fs.existsSync(assetsDir)) {
  throw new Error(
    "Missing .open-next/assets. Run the OpenNext build before preparing the Pages output.",
  );
}

fs.rmSync(pagesDir, { recursive: true, force: true });
fs.mkdirSync(pagesDir, { recursive: true });

copyTree(assetsDir, pagesDir);
copyOpenNextRuntime(openNextDir, path.join(pagesDir, ".open-next"));
removeBundledEnvFiles(path.join(pagesDir, ".open-next"));

fs.writeFileSync(
  wrappedWorkerEntry,
  [
    'export * from "./.open-next/worker.js";',
    'export { default } from "./.open-next/worker.js";',
    "",
  ].join("\n"),
  "utf8",
);

console.log("Prepared Cloudflare Pages output in .pages");

function copyOpenNextRuntime(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === "assets") {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    copyTree(sourcePath, destinationPath);
  }
}

function copyTree(sourcePath, destinationPath) {
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    dereference: true,
    force: true,
  });
}

function removeBundledEnvFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      removeBundledEnvFiles(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name === ".env") {
      fs.rmSync(entryPath, { force: true });
    }
  }
}