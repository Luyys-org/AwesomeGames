import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appGameDir = path.join(root, "app", "game");

function readManifest(dirName) {
  const manifestPath = path.join(root, dirName, "manifest.json");
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function gameSlugs() {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules")
    .map((entry) => entry.name)
    .filter((name) => readManifest(name)?.kind === "game");
}

function walkPages(dir, relative = "", found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, nextRelative, found);
    else if (entry.name === "page.tsx") found.push(nextRelative.replaceAll("\\", "/"));
  }
  return found;
}

function isUseClient(source) {
  return /^\s*['"]use client['"]/.test(source);
}

function exportsMetadata(source) {
  return /^export const metadata\b/m.test(source) || /^export \{[^}]*\bmetadata\b/m.test(source);
}

function shimSource(slug, relativePage) {
  const importPath = `@/${slug}/app/${relativePage.replace(/\.tsx$/, "")}`;
  const source = fs.readFileSync(path.join(root, slug, "app", relativePage), "utf8");
  const lines = [];
  if (isUseClient(source)) {
    lines.push('"use client";', "");
  }
  if (!isUseClient(source) && exportsMetadata(source)) {
    lines.push(`export { default, metadata } from "${importPath}";`);
  } else {
    lines.push(`export { default } from "${importPath}";`);
  }
  lines.push("");
  return lines.join("\n");
}

function walkShimPages(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkShimPages(full, found);
    else if (entry.name === "page.tsx") found.push(full);
  }
  return found;
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name));
  }
  if (dir !== appGameDir && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

const expected = new Map();

for (const slug of gameSlugs()) {
  for (const relativePage of walkPages(path.join(root, slug, "app"))) {
    const destination = path.join(appGameDir, slug, relativePage);
    expected.set(destination, shimSource(slug, relativePage));
  }
}

for (const [destination, contents] of expected) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const current = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8").replaceAll("\r\n", "\n") : null;
  if (current !== contents) fs.writeFileSync(destination, contents);
}

for (const existing of walkShimPages(appGameDir)) {
  if (!expected.has(existing)) fs.rmSync(existing);
}

pruneEmptyDirs(appGameDir);
