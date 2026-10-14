import type { BoardPiece, GameStateView, PieceColor, PieceType } from "@/leaders/services/game.types";
import type { RoomMemberView } from "@/leaders/services/room.types";

/** Username for a seat. The host plays black and the guest plays white. */
export function displayUsernameForPlayerId(
  targetPlayerId: string | null | undefined,
  game: Pick<GameStateView, "blackPlayerId" | "whitePlayerId">,
  members: RoomMemberView[] | undefined,
): string {
  if (!targetPlayerId) {
    return "Unknown player";
  }

  const host = members?.find((member) => member.role === "HOST")?.username;
  const guest = members?.find((member) => member.role === "GUEST")?.username;
  if (targetPlayerId === game.blackPlayerId) {
    return host ?? "Player 1";
  }
  if (targetPlayerId === game.whitePlayerId) {
    return guest ?? "Player 2";
  }

  return "Unknown player";
}

export function viewerColorFromPlayerId(
  game: GameStateView,
  playerId: string | null,
): PieceColor | null {
  if (!playerId) {
    return null;
  }

  if (playerId === game.blackPlayerId) {
    return "BLACK";
  }

  if (playerId === game.whitePlayerId) {
    return "WHITE";
  }

  return null;
}

export function opponentColor(color: PieceColor): PieceColor {
  return color === "BLACK" ? "WHITE" : "BLACK";
}

export function findLeaderPiece(
  game: GameStateView,
  owner: PieceColor,
): BoardPiece | null {
  const pieces = game.pieces ? Object.values(game.pieces) : [];

  for (const piece of pieces) {
    if (piece.owner === owner && piece.type === "LEADER") {
      return piece;
    }
  }

  return null;
}

export function leaderCardType(
  game: GameStateView,
  owner: PieceColor,
): PieceType {
  const leader = findLeaderPiece(game, owner);
  return leader?.type ?? "LEADER";
}

export function pieceIdAtCell(game: GameStateView, cellId: number): string | null {
  const key = String(cellId);
  return game.cellToPiece?.[key] ?? null;
}

export function pieceAtCell(game: GameStateView, cellId: number): BoardPiece | null {
  const pieceId = pieceIdAtCell(game, cellId);
  if (!pieceId || !game.pieces) {
    return null;
  }

  return game.pieces[pieceId] ?? null;
}

export function isCellEmpty(game: GameStateView, cellId: number): boolean {
  return pieceIdAtCell(game, cellId) === null;
}

export function handForColor(game: GameStateView, owner: PieceColor): PieceType[] {
  return owner === "BLACK" ? (game.blackHand ?? []) : (game.whiteHand ?? []);
}

export type ActiveCardSlotSource = "leader" | "hand" | "pending-recruit";

export interface ActiveCardSlot {
  pieceType: PieceType;
  source: ActiveCardSlotSource;
  /** Index in the server hand array when `source` is `"hand"`. */
  handIndex?: number;
}

/** Leader first, optional pending recruit, then remaining hand cards (for the active-card row). */
export function activeCardSlotsForColor(
  game: GameStateView,
  owner: PieceColor,
  pendingRecruitPieceType?: PieceType | null,
): ActiveCardSlot[] {
  const hand = handForColor(game, owner);
  const leaderType = leaderCardType(game, owner);
  const handRest = hand[0] === "LEADER" ? hand.slice(1) : hand;
  const leaderHandOffset = hand[0] === "LEADER" ? 1 : 0;

  const slots: ActiveCardSlot[] = [{ pieceType: leaderType, source: "leader" }];

  if (pendingRecruitPieceType) {
    slots.push({ pieceType: pendingRecruitPieceType, source: "pending-recruit" });
  }

  for (let i = 0; i < handRest.length; i += 1) {
    slots.push({
      pieceType: handRest[i],
      source: "hand",
      handIndex: i + leaderHandOffset,
    });
  }

  return slots;
}

export function isActiveCardSlotFlippedForAction(
  game: GameStateView,
  owner: PieceColor,
  hand: PieceType[],
  slot: ActiveCardSlot,
): boolean {
  if (slot.source === "pending-recruit") {
    return false;
  }

  if (slot.source === "leader") {
    const leader = findLeaderPiece(game, owner);
    return leader ? hasPieceActedThisPhase(game, leader.id) : false;
  }

  if (slot.source === "hand" && slot.handIndex !== undefined) {
    return isHandCardFlippedForAction(game, owner, hand, slot.handIndex);
  }

  return false;
}

function boardPiecesForOwner(game: GameStateView, owner: PieceColor): BoardPiece[] {
  if (!game.pieces) {
    return [];
  }

  return Object.values(game.pieces).filter((piece) => piece.owner === owner);
}

function pieceIdsForHandCard(
  game: GameStateView,
  owner: PieceColor,
  hand: PieceType[],
  cardIndex: number,
): string | null {
  const cardType = hand[cardIndex];
  if (!cardType) {
    return null;
  }

  const piecesOfType = boardPiecesForOwner(game, owner)
    .filter((piece) => piece.type === cardType)
    .sort((left, right) => left.cellId - right.cellId || left.id.localeCompare(right.id));

  let seenInHand = 0;
  for (let i = 0; i <= cardIndex; i += 1) {
    if (hand[i] === cardType) {
      seenInHand += 1;
    }
  }

  return piecesOfType[seenInHand - 1]?.id ?? null;
}

/** Card flips when its board figure has acted this action phase (`actedThisPhase`). */
export function isHandCardFlippedForAction(
  game: GameStateView,
  owner: PieceColor,
  hand: PieceType[],
  cardIndex: number,
): boolean {
  const pieceId = pieceIdsForHandCard(game, owner, hand, cardIndex);
  if (!pieceId) {
    return false;
  }

  return game.actedThisPhase?.includes(pieceId) ?? false;
}

export function formatGamePhaseLabel(phase: GameStateView["phase"]): string {
  return phase === "ACTION" ? "Action phase" : "Recruitment phase";
}

export function hasPieceActedThisPhase(game: GameStateView, pieceId: string): boolean {
  return game.actedThisPhase?.includes(pieceId) ?? false;
}

export function findNemesisPiece(
  game: GameStateView,
  owner: PieceColor,
): BoardPiece | null {
  const pieces = game.pieces ? Object.values(game.pieces) : [];

  for (const piece of pieces) {
    if (piece.owner === owner && piece.type === "NEMESIS") {
      return piece;
    }
  }

  return null;
}

/** Opponent moved their Leader; this player must move Nemesis before play continues. */
export function viewerMustResolveNemesis(
  game: GameStateView,
  viewerColor: PieceColor,
): boolean {
  if (game.phase !== "ACTION" || !game.resolvingNemesis) {
    return false;
  }

  return findNemesisPiece(game, viewerColor) !== null;
}

/** Who may interact during ACTION: active player, or only the Nemesis owner while resolving. */
export function viewerCanActInActionPhase(
  game: GameStateView,
  viewerColor: PieceColor,
): boolean {
  if (game.phase !== "ACTION") {
    return false;
  }

  if (game.resolvingNemesis) {
    return viewerMustResolveNemesis(game, viewerColor);
  }

  return game.activeColor === viewerColor;
}

export function selectableActionPieceAtCell(
  game: GameStateView,
  viewerColor: PieceColor,
  cellId: number,
): BoardPiece | null {
  if (game.phase !== "ACTION" || game.activeColor !== viewerColor) {
    return null;
  }

  const piece = pieceAtCell(game, cellId);
  if (!piece || piece.owner !== viewerColor) {
    return null;
  }

  if (hasPieceActedThisPhase(game, piece.id)) {
    return null;
  }

  return piece;
}
