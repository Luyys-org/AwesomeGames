import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npm run create-game -- <slug>");
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Slug must be lowercase letters, digits, and single hyphens.");
  process.exit(1);
}

const reserved = new Set([
  "app",
  "build",
  "common",
  "coverage",
  "dashboard",
  "docs",
  "node_modules",
  "out",
  "pages",
  "public",
  "references",
  "scripts",
  "src",
  "types",
]);

if (reserved.has(slug)) {
  console.error(`"${slug}" is reserved.`);
  process.exit(1);
}

const destination = path.join(process.cwd(), slug);
if (fs.existsSync(destination)) {
  console.error(`"${slug}" already exists.`);
  process.exit(1);
}

const title = slug
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");

fs.mkdirSync(path.join(destination, "app"), { recursive: true });

fs.writeFileSync(
  path.join(destination, "manifest.json"),
  `${JSON.stringify({ kind: "game", title, description: "" }, null, 2)}\n`,
);

fs.writeFileSync(
  path.join(destination, "paths.ts"),
  `import { gameHomePath } from "@/common/game-path";

export const paths = {
  home: gameHomePath("${slug}"),
};
`,
);

fs.writeFileSync(
  path.join(destination, "app", "page.tsx"),
  `import manifest from "../manifest.json";

export default function GamePage() {
  return (
    <main className="page-shell mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
      <h1 className="text-2xl font-semibold">{manifest.title}</h1>
    </main>
  );
}
`,
);

const sync = spawnSync(process.execPath, [path.join("scripts", "sync-game-routes.mjs")], {
  stdio: "inherit",
});

if (sync.status !== 0) {
  process.exit(sync.status ?? 1);
}

console.log(`Created ${slug} at /game/${slug}`);
