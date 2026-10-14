import type { PieceColor, PieceType } from "@/leaders/services/game.types";

const PIECE_LABELS = {
  LEADER: "Leader",
  SHAMAN: "Shaman",
  SNIPER: "Sniper",
  TACTICIAN: "Tactician",
  WILL_O_THE_WISP: "Will-o'-the-Wisp",
  ACROBAT: "Acrobat",
  RIDER: "Rider",
  BRUISER: "Bruiser",
  ROYAL_GUARD: "Royal Guard",
  ILLUSIONIST: "Illusionist",
  CLAW_LAUNCHER: "Claw Launcher",
  MANIPULATOR: "Manipulator",
  WANDERER: "Wanderer",
  BREWMASTER: "Brewmaster",
  ARCHER: "Archer",
  ASSASSIN: "Assassin",
  JAILOR: "Jailor",
  PROTECTOR: "Protector",
  VIZIER: "Vizier",
  NEMESIS: "Nemesis",
  HERMIT: "Hermit",
  CUB: "Cub",
} as const satisfies Record<PieceType, string>;

export function formatPieceTypeName(type: PieceType): string {
  return PIECE_LABELS[type];
}

export function pieceTypeInitial(type: PieceType): string {
  const name = formatPieceTypeName(type);
  const letter = name.match(/[a-zA-Z]/)?.[0];
  return (letter ?? "?").toUpperCase();
}

export function pieceOwnerFill(owner: PieceColor): string {
  return owner === "BLACK" ? "#18181b" : "#f4f4f5";
}

/** Board token background: viewer’s pieces white, opponent’s black (display-relative seat). */
export function pieceOwnerTokenBackground(displayOwner: PieceColor): string {
  return displayOwner === "WHITE" ? "#ffffff" : "#0a0a0a";
}

export function pieceOwnerLabelColor(owner: PieceColor): string {
  return owner === "BLACK" ? "#fafafa" : "#18181b";
}

/** Classic portrait playing-card ratio (width × height). */
export const CHARACTER_CARD_WIDTH_PX = 88;
export const CHARACTER_CARD_HEIGHT_PX = 124;

/** Gap between cards in hand rows (`gap-2`). */
export const CHARACTER_CARD_HAND_GAP_PX = 8;

/** Max hand slots shown in a row (leader + 4 hand cards + optional pending recruit). */
export const CHARACTER_CARD_HAND_MAX_SLOTS = 6;

export function characterHandRowWidthPx(
  slotCount = CHARACTER_CARD_HAND_MAX_SLOTS,
): number {
  if (slotCount <= 0) {
    return 0;
  }

  return (
    slotCount * CHARACTER_CARD_WIDTH_PX +
    (slotCount - 1) * CHARACTER_CARD_HAND_GAP_PX
  );
}

/** Neutral card back (e.g. recruitment offers); player decks use `pieceOwnerTokenBackground`. */
export const CHARACTER_CARD_BACK_COLOR = "#3f3f46";

/** Legacy accent hash; card faces use portrait art from character-metadata. */
export function pieceAccentColor(type: PieceType): string {
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) {
    hash = (hash * 31 + type.charCodeAt(i)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 58% 42%)`;
}
