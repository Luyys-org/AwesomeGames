import type { Metadata } from "next";
import Link from "next/link";

import { CharacterRosterGrid } from "@/leaders/features/landing/character-roster-grid";
import { HexBackdrop } from "@/leaders/features/landing/hex-backdrop";
import { LandingCredits } from "@/leaders/features/landing/landing-credits";
import { LandingGameRules } from "@/leaders/features/landing/landing-game-rules";
import { PlayHeader } from "@/leaders/features/play/play-header";
import { PlayPanel } from "@/leaders/features/play/play-panel";

export const metadata: Metadata = {
  title: { absolute: "Dirigeant — Hex strategy arena" },
  description:
    "Dirigeant is a 1v1 turn-based hex strategy game. Open a room and play in the browser.",
};

export default function PlayPage() {
  return (
    <div className="page-shell relative flex min-h-full flex-1 flex-col">
      <HexBackdrop />
      <PlayHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 flex-1 lg:max-w-xl">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
          >
            All games
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-50">Play Leaders online</h1>
          <p className="mt-2 text-base text-zinc-400">
            Host a private 1v1 room or join with a code. Spectators can watch
            after both seats are taken.
          </p>

          <div className="mt-8">
            <LandingGameRules />
          </div>

          <CharacterRosterGrid />
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-8 lg:w-[min(100%,28rem)]">
          <PlayPanel />
          <div className="mt-6">
            <LandingCredits />
          </div>
        </div>
      </div>
    </div>
  );
}
