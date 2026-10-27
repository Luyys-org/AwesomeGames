import type { Metadata } from "next";
import Link from "next/link";

import { LandingScreen } from "@/rpg/features/landing/landing-screen";

export const metadata: Metadata = {
  title: "RPG",
  description: "Host a cooperative table or join with a room code.",
};

export default function RpgHomePage() {
  return (
    <main className="page-shell mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
      >
        All games
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-50">RPG</h1>
      <p className="mt-2 max-w-xl text-base text-zinc-400">
        Host a table for 1–6 players, or join with a room code.
      </p>
      <LandingScreen />
    </main>
  );
}
