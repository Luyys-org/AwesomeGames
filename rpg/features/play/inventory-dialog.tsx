"use client";

import type { InventoryItem } from "@/rpg/lib/character";

interface InventoryDialogProps {
  items: InventoryItem[];
  onClose: () => void;
}

export function InventoryDialog({ items, onClose }: InventoryDialogProps) {
  const equipped = items.filter((item) => item.equipped);
  const packed = items.filter((item) => !item.equipped);

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

        <section className="mt-6" aria-labelledby="equipped-heading">
          <h3 id="equipped-heading" className="text-sm font-medium text-zinc-300">
            Equipped
          </h3>
          <ItemList items={equipped} empty="Nothing equipped." />
        </section>

        <section className="mt-6" aria-labelledby="packed-heading">
          <h3 id="packed-heading" className="text-sm font-medium text-zinc-300">
            Not equipped
          </h3>
          <ItemList items={packed} empty="No other items." />
        </section>
      </div>
    </div>
  );
}

function ItemList({ items, empty }: { items: InventoryItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-zinc-400">{empty}</p>;
  }

  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li key={item.id} className="border-t border-[var(--border)] py-2 text-sm text-zinc-50 first:border-t-0">
          {item.name}
        </li>
      ))}
    </ul>
  );
}
