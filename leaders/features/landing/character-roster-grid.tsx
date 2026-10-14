"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";

import {
  computeAbilityTooltipAnchor,
  type AbilityTooltipAnchor,
} from "@/leaders/features/game/character-ability-hover-tooltip";
import { LANDING_ROSTER, type LandingRosterEntry } from "@/leaders/lib/landing-characters";

function RosterHoverTooltip({
  entry,
  anchor,
}: {
  entry: LandingRosterEntry;
  anchor: AbilityTooltipAnchor;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 8;

    let top =
      anchor.placement === "above"
        ? anchor.y - rect.height - gap
        : anchor.y + gap;
    let left = anchor.x - rect.width / 2;

    left = Math.max(margin, Math.min(left, vw - margin - rect.width));
    top = Math.max(margin, Math.min(top, vh - margin - rect.height));

    setPosition({ left, top });
  }, [anchor, entry.description]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className="tooltip pointer-events-none fixed z-[9999] w-[min(260px,calc(100vw-1.5rem))] px-3 py-2"
      style={{
        left: position?.left ?? anchor.x,
        top: position?.top ?? anchor.y,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <p className="text-sm font-medium text-zinc-100">{entry.name}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{entry.description}</p>
    </div>,
    document.body,
  );
}

export function CharacterRosterGrid() {
  const [hovered, setHovered] = useState<{
    entry: LandingRosterEntry;
    anchor: AbilityTooltipAnchor;
  } | null>(null);

  return (
    <section aria-labelledby="roster-heading" className="mt-10">
      <h2 id="roster-heading" className="text-lg font-semibold text-zinc-50">
        Characters
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Hover a portrait for a short ability summary.
      </p>

      <ul className="mt-4 grid grid-cols-5 gap-x-3 gap-y-2 sm:gap-x-4">
        {LANDING_ROSTER.map((entry) => (
          <li key={entry.key} className="flex justify-center">
            <button
              type="button"
              className="group relative flex size-[100px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900/80 p-1 transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              onMouseEnter={(event) => {
                setHovered({
                  entry,
                  anchor: computeAbilityTooltipAnchor(event.currentTarget),
                });
              }}
              onMouseLeave={() => {
                setHovered(null);
              }}
              onFocus={(event) => {
                setHovered({
                  entry,
                  anchor: computeAbilityTooltipAnchor(event.currentTarget),
                });
              }}
              onBlur={() => {
                setHovered(null);
              }}
              aria-label={`${entry.name}: ${entry.description}`}
            >
              <Image
                src={entry.imageSrc}
                alt=""
                width={80}
                height={80}
                className="size-[80px] object-contain"
                draggable={false}
              />
            </button>
          </li>
        ))}
      </ul>

      {hovered ? (
        <RosterHoverTooltip entry={hovered.entry} anchor={hovered.anchor} />
      ) : null}
    </section>
  );
}
