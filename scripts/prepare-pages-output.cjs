const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const pagesDir = path.join(rootDir, ".pages");
const nextServerAppDir = path.join(rootDir, ".next", "server", "app");
const nextStaticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const indexHtmlPath = path.join(nextServerAppDir, "index.html");
const faviconBodyPath = path.join(nextServerAppDir, "favicon.ico.body");

if (!fs.existsSync(indexHtmlPath)) {
  throw new Error("Missing .next/server/app/index.html. Run next build before preparing the Pages output.");
}

if (!fs.existsSync(nextStaticDir)) {
  throw new Error("Missing .next/static. Run next build before preparing the Pages output.");
}

fs.rmSync(pagesDir, { recursive: true, force: true });
fs.mkdirSync(pagesDir, { recursive: true });

fs.copyFileSync(indexHtmlPath, path.join(pagesDir, "index.html"));

if (fs.existsSync(faviconBodyPath)) {
  fs.copyFileSync(faviconBodyPath, path.join(pagesDir, "favicon.ico"));
}

copyDirContents(nextStaticDir, path.join(pagesDir, "_next", "static"));

if (fs.existsSync(publicDir)) {
  copyPublicAssets(publicDir, pagesDir);
}

console.log("Prepared static Cloudflare Pages output in .pages");

function copyDirContents(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirContents(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function copyPublicAssets(sourceDir, destinationDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirContents(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}