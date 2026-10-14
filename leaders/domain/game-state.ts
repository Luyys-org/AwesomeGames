import type { BoardPiece, GamePendingAbility, GamePhase, GameStatus, PieceColor, PieceType } from "@/leaders/services/game.types";

import { IllegalGameMoveException } from "@/leaders/domain/errors";

export interface GameState {
  gameId: string;
  roomId: string;
  version: number;
  status: GameStatus;
  winnerPlayerId: string | null;
  blackPlayerId: string;
  whitePlayerId: string;
  activeColor: PieceColor;
  firstPlayerColor: PieceColor;
  turnNumber: number;
  phase: GamePhase;
  recruitmentPhasesRemaining: number;
  cellToPiece: Record<string, string>;
  pieces: Record<string, BoardPiece>;
  faceUpOffers: PieceType[];
  deck: PieceType[];
  blackHand: PieceType[];
  whiteHand: PieceType[];
  actedThisPhase: string[];
  /** Omitted from the wire view. Host state must keep it. */
  activeAbilityBlockedThisPhase: string[];
  frogExpiresAfterOpponentTurn: Record<string, number>;
  resolvingNemesis: boolean;
  pendingAbility: GamePendingAbility | null;
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function opponent(color: PieceColor): PieceColor {
  return color === "BLACK" ? "WHITE" : "BLACK";
}

export function playerIdFor(state: GameState, color: PieceColor): string {
  return color === "BLACK" ? state.blackPlayerId : state.whitePlayerId;
}

export function colorOfPlayer(state: GameState, playerId: string): PieceColor {
  if (playerId === state.blackPlayerId) {
    return "BLACK";
  }
  if (playerId === state.whitePlayerId) {
    return "WHITE";
  }
  throw new IllegalGameMoveException("Not a player in this game");
}

export function handOf(state: GameState, color: PieceColor): PieceType[] {
  return color === "BLACK" ? state.blackHand : state.whiteHand;
}

export function pieceAt(state: GameState, cellId: number): BoardPiece | undefined {
  const pieceId = state.cellToPiece[String(cellId)];
  return pieceId ? state.pieces[pieceId] : undefined;
}

export function isOccupied(state: GameState, cellId: number): boolean {
  return pieceAt(state, cellId) != null;
}

export function piecesOf(state: GameState): BoardPiece[] {
  return Object.values(state.pieces);
}

export function requirePiece(state: GameState, pieceId: string | undefined): BoardPiece {
  if (!pieceId || !state.pieces[pieceId]) {
    throw new IllegalGameMoveException("Piece not found");
  }
  return state.pieces[pieceId];
}

export function findPieceOfType(
  state: GameState,
  color: PieceColor,
  type: PieceType,
): BoardPiece | undefined {
  return piecesOf(state).find((piece) => piece.owner === color && piece.type === type);
}

export function findLeader(state: GameState, color: PieceColor): BoardPiece | undefined {
  return findPieceOfType(state, color, "LEADER");
}

export function placePiece(
  state: GameState,
  type: PieceType,
  owner: PieceColor,
  cellId: number,
  id: string,
): BoardPiece {
  const piece: BoardPiece = { id, type, owner, cellId, frog: false };
  state.pieces[id] = piece;
  state.cellToPiece[String(cellId)] = id;
  return piece;
}

export function relocate(state: GameState, pieceId: string, toCell: number): void {
  const piece = state.pieces[pieceId];
  delete state.cellToPiece[String(piece.cellId)];
  piece.cellId = toCell;
  state.cellToPiece[String(toCell)] = pieceId;
}

export function markActed(state: GameState, pieceId: string): void {
  if (!state.actedThisPhase.includes(pieceId)) {
    state.actedThisPhase.push(pieceId);
  }
}

/** Leader used Vizier passive this action; on-board Vizier pieces cannot move. */
export function consumeVizierPassive(state: GameState, color: PieceColor): void {
  for (const piece of piecesOf(state)) {
    if (piece.owner === color && piece.type === "VIZIER") {
      markActed(state, piece.id);
    }
  }
}
