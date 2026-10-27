"use client";

import { useState } from "react";

import type { InventoryItem } from "@/rpg/lib/character";
import {
  formatItemSlotLabel,
  itemModifierBonuses,
  itemModifierMaluses,
  type CharacterOptions,
} from "@/rpg/lib/character-options";

interface InventoryDialogProps {
  items: InventoryItem[];
  characterOptions: CharacterOptions;
  controlsLocked: boolean;
  onSetEquipped: (itemId: string, equipped: boolean) => Promise<string | null>;
  onClose: () => void;
}

export function InventoryDialog({
  items,
  characterOptions,
  controlsLocked,
  onSetEquipped,
  onClose,
}: InventoryDialogProps) {
  const equipped = items.filter((item) => item.equipped);
  const packed = items.filter((item) => !item.equipped);
  const stats = characterOptions.stats;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(item: InventoryItem) {
    if (controlsLocked || pendingId !== null) return;
    setPendingId(item.id);
    setError(null);
    void onSetEquipped(item.id, !item.equipped).then((message) => {
      setPendingId(null);
      if (message) setError(message);
    });
  }

  return (
    <div className="overlay fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close inventory"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-heading"
        className="panel relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="inventory-heading" className="text-xl font-semibold text-zinc-50">
            Inventory
          </h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <section className="mt-6" aria-labelledby="equipped-heading">
          <h3 id="equipped-heading" className="text-sm font-medium text-zinc-300">
            Equipped
          </h3>
          <ItemList
            items={equipped}
            allItems={items}
            stats={stats}
            empty="Nothing equipped."
            pendingId={pendingId}
            controlsLocked={controlsLocked}
            onToggle={toggle}
          />
        </section>

        <section className="mt-6" aria-labelledby="packed-heading">
          <h3 id="packed-heading" className="text-sm font-medium text-zinc-300">
            Not equipped
          </h3>
          <ItemList
            items={packed}
            allItems={items}
            stats={stats}
            empty="No other items."
            pendingId={pendingId}
            controlsLocked={controlsLocked}
            onToggle={toggle}
          />
        </section>
      </div>
    </div>
  );
}

function ItemList({
  items,
  allItems,
  stats,
  empty,
  pendingId,
  controlsLocked,
  onToggle,
}: {
  items: InventoryItem[];
  allItems: InventoryItem[];
  stats: CharacterOptions["stats"];
  empty: string;
  pendingId: string | null;
  controlsLocked: boolean;
  onToggle: (item: InventoryItem) => void;
}) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-zinc-400">{empty}</p>;
  }

  return (
    <ul className="mt-2">
      {items.map((item) => {
        const slotTaken =
          !item.equipped &&
          item.slot.length > 0 &&
          allItems.some((entry) => entry.equipped && entry.slot === item.slot);
        return (
          <li key={item.id} className="border-t border-[var(--border)] py-3 text-sm first:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-50">{item.name}</p>
                <dl className="mt-1 space-y-0.5 text-zinc-400">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-zinc-500">Slot</dt>
                    <dd className="min-w-0 text-zinc-300">{formatItemSlotLabel(item.slot)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-zinc-500">Bonus</dt>
                    <dd className="min-w-0 text-zinc-300">{itemModifierBonuses(item.modifiers, stats)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-zinc-500">Malus</dt>
                    <dd className="min-w-0 text-zinc-300">{itemModifierMaluses(item.modifiers, stats)}</dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                className="btn btn-secondary shrink-0"
                disabled={controlsLocked || pendingId !== null || slotTaken}
                onClick={() => onToggle(item)}
              >
                {pendingId === item.id ? "…" : item.equipped ? "Unequip" : "Equip"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
