import { existsSync } from "node:fs";
import path from "node:path";

import Link from "next/link";

import { gameHomePath } from "@/common/game-path";
import { listGames } from "@/common/list-games";

function dashboardArtSrc(slug: string): string | null {
  const filePath = path.join(process.cwd(), "public", "dashboard", `${slug}.png`);
  return existsSync(filePath) ? `/dashboard/${slug}.png` : null;
}

export default function DashboardPage() {
  const games = listGames();

  return (
    <main className="page-shell mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      <h1 className="text-2xl font-semibold">Games</h1>
      {games.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No games yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {games.map((game) => {
            const artSrc = dashboardArtSrc(game.slug);

            return (
              <li key={game.slug}>
                <Link
                  href={gameHomePath(game.slug)}
                  className="group panel relative block min-h-28 overflow-hidden p-4 no-underline transition-colors duration-150 hover:border-zinc-500"
                >
                  <span className="relative z-10 block max-w-[48%] text-base font-medium text-zinc-50">
                    {game.title}
                  </span>
                  {game.description ? (
                    <span className="relative z-10 mt-1 block max-w-[48%] text-sm text-zinc-400">
                      {game.description}
                    </span>
                  ) : null}
                  {artSrc ? (
                    <img
                      src={artSrc}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      decoding="async"
                      className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-none translate-x-[calc(100%+4px)] transition-[translate] duration-200 ease-out group-hover:translate-x-0 group-focus-visible:translate-x-0"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
