"use client";

import { legalActionChoiceLabel } from "@/leaders/lib/game-legal-actions";
import type { GameLegalAction } from "@/leaders/services/game.types";

interface ActionChoiceOverlayProps {
  choices: GameLegalAction[];
  isSubmitting: boolean;
  onChoose: (actionKey: string) => void;
  onDismiss: () => void;
}

export function ActionChoiceOverlay({
  choices,
  isSubmitting,
  onChoose,
  onDismiss,
}: ActionChoiceOverlayProps) {
  if (choices.length === 0) {
    return null;
  }

  const hasMove = choices.some((choice) => choice.type === "DEFAULT_MOVE");
  const hasAbility = choices.some((choice) => choice.type === "ACTIVE_ABILITY");

  const description =
    hasMove && hasAbility
      ? "This hex is valid for both a normal move and this character's ability. Choose one."
      : "Several actions use this hex. Choose one.";

  return (
    <div
      className="overlay absolute inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-choice-title"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 shadow-lg">
        <p id="action-choice-title" className="text-base font-semibold text-zinc-50">
          Choose an action
        </p>
        <p className="mt-2 text-sm text-zinc-300">{description}</p>

        <div className="mt-4 flex flex-col gap-2">
          {choices.map((choice) => (
            <button
              key={choice.actionKey}
              type="button"
              disabled={isSubmitting}
              onClick={() => onChoose(choice.actionKey)}
              className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {legalActionChoiceLabel(choice)}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onDismiss}
            className="mt-1 rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
