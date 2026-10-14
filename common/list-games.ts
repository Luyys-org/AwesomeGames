import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface GameManifest {
  slug: string;
  title: string;
  description: string;
}

interface ManifestFile {
  kind?: unknown;
  title?: unknown;
  description?: unknown;
}

export function listGames(root = process.cwd()): GameManifest[] {
  const games: GameManifest[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    const manifestPath = path.join(root, entry.name, "manifest.json");
    let parsed: ManifestFile;
    try {
      parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestFile;
    } catch {
      continue;
    }

    if (parsed.kind !== "game") continue;
    if (typeof parsed.title !== "string" || typeof parsed.description !== "string") continue;

    games.push({
      slug: entry.name,
      title: parsed.title,
      description: parsed.description,
    });
  }

  games.sort((a, b) => a.title.localeCompare(b.title));
  return games;
}
