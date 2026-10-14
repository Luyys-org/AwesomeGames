"use client";

import { useCallback, useRef, useState } from "react";

import { CharacterAbilityText } from "@/leaders/features/game/character-ability-text";
import {
  CharacterAbilityHoverTooltip,
  computeAbilityTooltipAnchor,
  type AbilityTooltipAnchor,
} from "@/leaders/features/game/character-ability-hover-tooltip";
import { characterPortraitPath } from "@/leaders/lib/character-metadata";
import {
  CHARACTER_CARD_BACK_COLOR,
  CHARACTER_CARD_HEIGHT_PX,
  CHARACTER_CARD_WIDTH_PX,
  formatPieceTypeName,
} from "@/leaders/lib/piece-display";
import type { PieceType } from "@/leaders/services/game.types";

interface CharacterCardProps {
  pieceType: PieceType;
  label?: string;
  faceDown?: boolean;
  /** Player deck fill (face and back); defaults to neutral gray when omitted. */
  deckColor?: string;
  /** Eager-load portrait when above the fold (e.g. hand leader on game load). */
  priority?: boolean;
  showAbilityDescription?: boolean;
  showHoverAbility?: boolean;
}

export function CharacterCard({
  pieceType,
  label,
  faceDown = false,
  deckColor = CHARACTER_CARD_BACK_COLOR,
  priority = false,
  showAbilityDescription = false,
  showHoverAbility = false,
}: CharacterCardProps) {
  const name = label ?? formatPieceTypeName(pieceType);
  const portraitSrc = characterPortraitPath(pieceType);
  const hoverTargetRef = useRef<HTMLDivElement>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<AbilityTooltipAnchor | null>(null);

  const showTooltip = useCallback(() => {
    if (!showHoverAbility || showAbilityDescription || !hoverTargetRef.current) {
      return;
    }

    setTooltipAnchor(computeAbilityTooltipAnchor(hoverTargetRef.current));
  }, [showAbilityDescription, showHoverAbility]);

  const hideTooltip = useCallback(() => {
    setTooltipAnchor(null);
  }, []);

  const cardFace = (
    <div
      ref={hoverTargetRef}
      className="shrink-0"
      style={{
        width: CHARACTER_CARD_WIDTH_PX,
        height: CHARACTER_CARD_HEIGHT_PX,
        perspective: "900px",
      }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      tabIndex={showHoverAbility && !showAbilityDescription ? 0 : undefined}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          faceDown ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border-2 border-zinc-600/90 shadow-lg ring-1 ring-black/20 [backface-visibility:hidden]"
          style={{ backgroundColor: deckColor }}
        >
          {/* Same PNG + meet sizing as hex board tokens; avoid next/image so alpha is preserved. */}
          <img
            src={portraitSrc}
            alt={name}
            width={CHARACTER_CARD_WIDTH_PX}
            height={CHARACTER_CARD_HEIGHT_PX}
            draggable={false}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            loading={priority ? "eager" : "lazy"}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-lg border-2 border-zinc-600/90 shadow-lg ring-1 ring-black/20 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ backgroundColor: deckColor }}
          aria-hidden={!faceDown}
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_8px)]" />
          <div className="relative flex h-full items-center justify-center">
            <div className="h-10 w-10 rounded-full border border-zinc-500/50 bg-zinc-700/40" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!showAbilityDescription) {
    return (
      <>
        {cardFace}
        <CharacterAbilityHoverTooltip
          pieceType={pieceType}
          anchor={tooltipAnchor}
          label={name}
        />
      </>
    );
  }

  return (
    <div className="flex max-w-[11rem] flex-col items-center gap-2">
      {cardFace}
      <CharacterAbilityText pieceType={pieceType} centered className="max-w-[11rem]" />
    </div>
  );
}
