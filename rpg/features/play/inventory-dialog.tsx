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

/** Interior of each square on public/rpg/inventory-equipped.png (1024×1536), as percentages. */
const DOLL_SLOTS: {
  id: string;
  aliases: readonly string[];
  left: string;
  top: string;
  width: string;
  height: string;
}[] = [
  { id: "head", aliases: ["head", "helmet", "helm"], left: "7.91%", top: "4.82%", width: "15.43%", height: "10.29%" },
  { id: "neck", aliases: ["neck", "necklace", "amulet", "pendant"], left: "76.66%", top: "4.82%", width: "15.43%", height: "10.29%" },
  { id: "shoulders", aliases: ["shoulders", "shoulder", "pauldron", "pauldrons"], left: "6.15%", top: "21.81%", width: "15.23%", height: "9.77%" },
  { id: "chest", aliases: ["chest", "torso", "breastplate"], left: "78.61%", top: "21.81%", width: "15.23%", height: "9.77%" },
  { id: "hands", aliases: ["hands", "hand", "gloves", "glove", "gauntlet", "gauntlets"], left: "4.69%", top: "40.04%", width: "14.26%", height: "10.35%" },
  { id: "ring", aliases: ["ring", "rings"], left: "81.15%", top: "40.62%", width: "14.16%", height: "9.44%" },
  { id: "belt", aliases: ["belt", "waist"], left: "7.13%", top: "59.31%", width: "16.70%", height: "10.87%" },
  { id: "legs", aliases: ["legs", "leg", "pants", "trousers"], left: "76.07%", top: "59.31%", width: "16.70%", height: "10.87%" },
  { id: "feet", aliases: ["feet", "foot", "boots", "boot"], left: "6.84%", top: "78.32%", width: "16.31%", height: "10.81%" },
  { id: "weapon", aliases: ["weapon", "main-hand", "mainhand"], left: "76.76%", top: "78.32%", width: "16.31%", height: "10.81%" },
];

function dollSlotId(slot: string): string | null {
  const match = DOLL_SLOTS.find((entry) => entry.aliases.includes(slot));
  return match?.id ?? null;
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
  const placed = new Map<string, InventoryItem>();
  const unmatched: InventoryItem[] = [];
  for (const item of equipped) {
    const slotId = dollSlotId(item.slot);
    if (!slotId || placed.has(slotId)) {
      unmatched.push(item);
      continue;
    }
    placed.set(slotId, item);
  }
  const equippedOrdered = [
    ...DOLL_SLOTS.flatMap((slot) => {
      const item = placed.get(slot.id);
      return item ? [item] : [];
    }),
    ...unmatched,
  ];
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
        className="panel relative z-10 max-h-[80vh] w-full max-w-4xl overflow-y-auto p-6"
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

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
          <section className="w-80 max-w-full shrink-0" aria-labelledby="equipped-heading">
            <h3 id="equipped-heading" className="text-sm font-medium text-zinc-300">
              Equipped
            </h3>
            <EquippedFigure placed={placed} />
          </section>

          <div className="min-w-0 flex-1">
            <section aria-labelledby="equipped-heading">
              <ItemList
                items={equippedOrdered}
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
      </div>
    </div>
  );
}

function EquippedFigure({ placed }: { placed: Map<string, InventoryItem> }) {
  return (
    <div className="relative mt-3 w-full">
      <img
        src="/rpg/inventory-equipped.png"
        alt=""
        draggable={false}
        className="block h-auto w-full select-none"
      />
      {DOLL_SLOTS.map((slot) => {
        const item = placed.get(slot.id);
        if (!item) return null;
        return (
          <div
            key={slot.id}
            title={item.name}
            aria-hidden="true"
            className="absolute flex items-center justify-center overflow-hidden rounded-md bg-[#0e0e0e] text-[#d4d4d4]"
            style={{ left: slot.left, top: slot.top, width: slot.width, height: slot.height }}
          >
            <GenericItemIcon />
          </div>
        );
      })}
    </div>
  );
}

function GenericItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[58%] w-[58%]">
      <path
        fill="currentColor"
        d="M4 8.2 12 4l8 4.2v7.6L12 20l-8-4.2V8.2Zm8 1.7L6.6 7.4 12 4.6l5.4 2.8L12 9.9Zm1 1.15 5.5-2.55v5.9L13 17.1v-6.05ZM11 17.1l-5.5-2.7V8.5L11 11.05v6.05Z"
      />
    </svg>
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
