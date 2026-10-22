import { games as generatedGames } from "./games.generated";

export interface GameManifest {
  slug: string;
  title: string;
  description: string;
}

export function listGames(): GameManifest[] {
  return generatedGames.map((game) => ({
    slug: game.slug,
    title: game.title,
    description: game.description,
  }));
}
