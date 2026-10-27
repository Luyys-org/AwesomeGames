"use client";

import {
  characterRollModifierSummary,
  characterStatRows,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import type { TableCharacter } from "@/rpg/lib/character";

interface StatsDialogProps {
  character: Pick<TableCharacter, "classId" | "raceId" | "raceStatIds" | "stats" | "inventory">;
  characterOptions: CharacterOptions;
  onClose: () => void;
}

export function StatsDialog({ character, characterOptions, onClose }: StatsDialogProps) {
  const rows = characterStatRows(character, characterOptions);
  const rolls = characterRollModifierSummary(character, characterOptions);

  return (
    <div className="overlay fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close stats"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-heading"
        className="panel relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="stats-heading" className="text-xl font-semibold text-zinc-50">
            Stats
          </h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="mt-6 space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm font-medium text-zinc-300">{row.label}</dt>
                <dd className="text-lg font-semibold tabular-nums text-zinc-50">{row.total}</dd>
              </div>
              <dd className="mt-1 text-sm text-zinc-400">{row.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-medium text-zinc-300">Roll modifiers</h3>
          <p className="mt-2 text-sm text-zinc-400">{rolls}</p>
        </div>
      </div>
    </div>
  );
}
