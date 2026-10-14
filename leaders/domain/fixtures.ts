import type { BoardPiece, GameCommandRequest, PieceColor, PieceType } from "@/leaders/services/game.types";

import { cellAt } from "@/leaders/domain/board";
import { placePiece, type GameState } from "@/leaders/domain/game-state";

export function emptyState(partial: Partial<GameState> = {}): GameState {
  return {
    gameId: "game",
    roomId: "room",
    version: 0,
    status: "IN_PROGRESS",
    winnerPlayerId: null,
    blackPlayerId: "black",
    whitePlayerId: "white",
    activeColor: "BLACK",
    firstPlayerColor: "BLACK",
    turnNumber: 1,
    phase: "ACTION",
    recruitmentPhasesRemaining: 1,
    cellToPiece: {},
    pieces: {},
    faceUpOffers: [],
    deck: [],
    blackHand: ["LEADER"],
    whiteHand: ["LEADER"],
    actedThisPhase: [],
    activeAbilityBlockedThisPhase: [],
    frogExpiresAfterOpponentTurn: {},
    resolvingNemesis: false,
    pendingAbility: null,
    ...partial,
  };
}

export function at(q: number, r: number): number {
  const cell = cellAt(q, r);
  if (!cell) {
    throw new Error(`No cell at ${q},${r}`);
  }
  return cell.id;
}

export function put(
  state: GameState,
  type: PieceType,
  owner: PieceColor,
  cellId: number,
  id?: string,
): BoardPiece {
  const piece = placePiece(state, type, owner, cellId, id ?? `${type}-${owner}-${cellId}`);
  if (type !== "LEADER") {
    const hand = owner === "BLACK" ? state.blackHand : state.whiteHand;
    if (!hand.includes(type)) {
      hand.push(type);
    }
  }
  return piece;
}

export function command(
  partial: Partial<GameCommandRequest> & Pick<GameCommandRequest, "type">,
): GameCommandRequest {
  return { expectedVersion: 0, ...partial };
}
