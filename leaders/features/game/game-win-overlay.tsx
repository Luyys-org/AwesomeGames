"use client";

import { buildMatchEndStatsForGame } from "@/leaders/services/game-data-tracker";
import type { PlayerEndMatchStats } from "@/leaders/services/game-data-tracker.types";
import { displayUsernameForPlayerId } from "@/leaders/lib/game-view-model";
import type { GameStateView } from "@/leaders/services/game.types";
import type { RoomMemberView } from "@/leaders/services/room.types";

interface GameWinOverlayProps {
  game: GameStateView;
  playerId: string | null;
  roomMembers?: RoomMemberView[];
  onDismiss: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-100">{value}</span>
    </div>
  );
}

function PlayerStatsCard({
  stats,
  isViewer,
}: {
  stats: PlayerEndMatchStats;
  isViewer: boolean;
}) {
  const traveledLabel = stats.mostTraveled
    ? `${stats.mostTraveled.pieceLabel} · ${stats.mostTraveled.hexesMoved} hex${
        stats.mostTraveled.hexesMoved === 1 ? "" : "es"
      }`
    : "—";

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        stats.isWinner
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-zinc-800 bg-zinc-950/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-50">
            {stats.displayName}
            {isViewer ? (
              <span className="ml-1.5 text-xs font-normal text-zinc-500">(you)</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {stats.color === "BLACK" ? "Black" : "White"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
            stats.isWinner
              ? "bg-amber-500/15 text-amber-100"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {stats.isWinner ? "Win" : "Loss"}
        </span>
      </div>

      <div className="mt-3">
        <StatRow label="Most traveled" value={traveledLabel} />
      </div>
    </div>
  );
}

export function GameWinOverlay({
  game,
  playerId,
  roomMembers,
  onDismiss,
}: GameWinOverlayProps) {
  const summary = buildMatchEndStatsForGame(game, roomMembers);
  const didWin =
    playerId !== null &&
    game.winnerPlayerId != null &&
    game.winnerPlayerId === playerId;
  const isSpectator = playerId === null;
  const winnerName = displayUsernameForPlayerId(game.winnerPlayerId, game, roomMembers);

  const title = isSpectator
    ? `${winnerName} wins`
    : didWin
      ? "You win!"
      : "You lose";

  return (
    <div
      className="overlay absolute inset-0 z-40 flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-win-title"
    >
      <div className="panel relative w-full max-w-2xl px-5 py-6 sm:px-7 sm:py-7">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Close"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M3 3L11 11M11 3L3 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <p
          id="game-win-title"
          className="pr-10 text-xl font-semibold text-zinc-50 sm:text-2xl"
        >
          {title}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {summary.turnNumber} {summary.turnNumber === 1 ? "round" : "rounds"}
        </p>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <StatRow label="End condition" value={summary.winConditionLabel} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PlayerStatsCard
            stats={summary.black}
            isViewer={playerId === summary.black.playerId}
          />
          <PlayerStatsCard
            stats={summary.white}
            isViewer={playerId === summary.white.playerId}
          />
        </div>
      </div>
    </div>
  );
}
