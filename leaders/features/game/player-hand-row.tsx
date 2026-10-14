import type { CSSProperties } from "react";

import { CharacterCard } from "@/leaders/features/game/character-card";
import { displayPieceColor } from "@/leaders/lib/board-presentation";
import {
  activeCardSlotsForColor,
  handForColor,
  isActiveCardSlotFlippedForAction,
} from "@/leaders/lib/game-view-model";
import { characterHandRowWidthPx, pieceOwnerTokenBackground } from "@/leaders/lib/piece-display";
import type { GameStateView, PieceColor, PieceType } from "@/leaders/services/game.types";

interface PlayerHandRowProps {
  game: GameStateView;
  owner: PieceColor;
  viewerColor: PieceColor;
  pendingRecruitPieceType?: PieceType | null;
  className?: string;
}

export function PlayerHandRow({
  game,
  owner,
  viewerColor,
  pendingRecruitPieceType = null,
  className = "",
}: PlayerHandRowProps) {
  const hand = handForColor(game, owner);
  const slots = activeCardSlotsForColor(game, owner, pendingRecruitPieceType);
  const deckColor = pieceOwnerTokenBackground(
    displayPieceColor(owner, viewerColor),
  );

  if (slots.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex max-w-[min(100%,var(--hand-row-width))] flex-nowrap gap-2 overflow-x-auto ${className}`}
      style={
        {
          "--hand-row-width": `${characterHandRowWidthPx()}px`,
        } as CSSProperties
      }
    >
      {slots.map((slot, index) => (
        <CharacterCard
          key={`${owner}-${slot.source}-${slot.pieceType}-${index}`}
          pieceType={slot.pieceType}
          deckColor={deckColor}
          priority={slot.source === "leader"}
          faceDown={isActiveCardSlotFlippedForAction(game, owner, hand, slot)}
          showHoverAbility={game.phase === "ACTION"}
        />
      ))}
    </div>
  );
}
