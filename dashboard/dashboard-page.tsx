import Link from "next/link";

import { gameHomePath } from "@/common/game-path";
import { listGames } from "@/common/list-games";

export default function DashboardPage() {
  const games = listGames();

  return (
    <main className="page-shell mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      <h1 className="text-2xl font-semibold">Games</h1>
      {games.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No games yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {games.map((game) => (
            <li key={game.slug}>
              <Link
                href={gameHomePath(game.slug)}
                className="panel block p-4 no-underline transition-colors duration-150 hover:border-zinc-500"
              >
                <span className="block text-base font-medium text-zinc-50">{game.title}</span>
                {game.description ? (
                  <span className="mt-1 block text-sm text-zinc-400">{game.description}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
