"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";

import { CharacterAbilityText } from "@/leaders/features/game/character-ability-text";
import { characterAbilityCopy } from "@/leaders/lib/character-metadata";
import { formatPieceTypeName } from "@/leaders/lib/piece-display";
import type { PieceType } from "@/leaders/services/game.types";

const VIEWPORT_MARGIN_PX = 12;
const GAP_PX = 8;

export type AbilityTooltipAnchor = {
  x: number;
  y: number;
  placement: "above" | "below";
};

export function computeAbilityTooltipAnchor(element: Element): AbilityTooltipAnchor {
  const rect = element.getBoundingClientRect();
  const placement = rect.top >= 120 ? "above" : "below";

  return {
    x: rect.left + rect.width / 2,
    y: placement === "above" ? rect.top : rect.bottom,
    placement,
  };
}

function clampTooltipToViewport(
  element: HTMLElement,
  anchor: AbilityTooltipAnchor,
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let placement = anchor.placement;

  const applyAnchorTransform = (side: AbilityTooltipAnchor["placement"]) => {
    element.style.left = `${anchor.x}px`;
    element.style.top = `${anchor.y}px`;
    element.style.transform =
      side === "above"
        ? `translate(-50%, calc(-100% - ${GAP_PX}px))`
        : `translate(-50%, ${GAP_PX}px)`;
  };

  applyAnchorTransform(placement);
  let rect = element.getBoundingClientRect();

  if (placement === "above" && rect.top < VIEWPORT_MARGIN_PX) {
    placement = "below";
    applyAnchorTransform(placement);
    rect = element.getBoundingClientRect();
  } else if (placement === "below" && rect.bottom > vh - VIEWPORT_MARGIN_PX) {
    placement = "above";
    applyAnchorTransform(placement);
    rect = element.getBoundingClientRect();
  }

  const maxLeft = vw - VIEWPORT_MARGIN_PX - rect.width;
  const maxTop = vh - VIEWPORT_MARGIN_PX - rect.height;

  return {
    left: Math.max(VIEWPORT_MARGIN_PX, Math.min(rect.left, maxLeft)),
    top: Math.max(VIEWPORT_MARGIN_PX, Math.min(rect.top, maxTop)),
  };
}

interface CharacterAbilityHoverTooltipProps {
  pieceType: PieceType;
  anchor: AbilityTooltipAnchor | null;
  label?: string;
}

export function CharacterAbilityHoverTooltip({
  pieceType,
  anchor,
  label,
}: CharacterAbilityHoverTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const name = label ?? formatPieceTypeName(pieceType);
  const abilityCopy = characterAbilityCopy(pieceType);
  const layoutKey = `${abilityCopy.summary}|${abilityCopy.rules.join("\n")}`;

  useLayoutEffect(() => {
    if (!anchor) {
      setClampedPosition(null);
      return;
    }

    const element = tooltipRef.current;
    if (!element) {
      return;
    }

    setClampedPosition(clampTooltipToViewport(element, anchor));
  }, [anchor, pieceType, layoutKey]);

  if (!anchor || typeof document === "undefined") {
    return null;
  }

  const isPositioned = clampedPosition !== null;

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={`${name}: ${abilityCopy.summary}`}
      className="tooltip pointer-events-none fixed z-[9999] w-[min(280px,calc(100vw-1.5rem))] px-3 py-2"
      style={{
        left: isPositioned ? clampedPosition.left : anchor.x,
        top: isPositioned ? clampedPosition.top : anchor.y,
        transform: isPositioned
          ? "none"
          : anchor.placement === "above"
            ? `translate(-50%, calc(-100% - ${GAP_PX}px))`
            : `translate(-50%, ${GAP_PX}px)`,
        visibility: isPositioned ? "visible" : "hidden",
      }}
    >
      <CharacterAbilityText pieceType={pieceType} />
    </div>,
    document.body,
  );
}
