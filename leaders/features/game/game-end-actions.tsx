"use client";

interface GameEndActionsProps {
  onReplay: () => void;
  onLeaveHome: () => void;
  isReplaying: boolean;
  isLeaving: boolean;
  replayError?: string | null;
  leaveError?: string | null;
}

export function GameEndActions({
  onReplay,
  onLeaveHome,
  isReplaying,
  isLeaving,
  replayError,
  leaveError,
}: GameEndActionsProps) {
  const disabled = isReplaying || isLeaving;

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-50 flex max-w-xs flex-col items-end gap-2 sm:bottom-4 sm:right-4">
      {(replayError ?? leaveError) ? (
        <p role="alert" className="pointer-events-auto text-right text-xs text-red-300">
          {replayError ?? leaveError}
        </p>
      ) : null}
      <div className="pointer-events-auto flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void onLeaveHome();
          }}
          className="rounded-lg border border-zinc-600 bg-zinc-950/90 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLeaving ? "Leaving…" : "Leave to home"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void onReplay();
          }}
          className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 transition-colors duration-150 hover:border-amber-400 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReplaying ? "Resetting…" : "Replay"}
        </button>
      </div>
    </div>
  );
}
