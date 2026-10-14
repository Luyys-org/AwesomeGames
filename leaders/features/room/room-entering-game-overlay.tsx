"use client";

interface RoomEnteringGameOverlayProps {
  active: boolean;
}

export function RoomEnteringGameOverlay({ active }: RoomEnteringGameOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="overlay fixed inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="panel mx-4 max-w-sm px-6 py-8 text-center">
        <p className="text-lg font-semibold text-zinc-50">Loading the game…</p>
        <p className="mt-2 text-sm text-zinc-400">
          Please wait. Room controls are disabled until the board is ready.
        </p>
      </div>
    </div>
  );
}
