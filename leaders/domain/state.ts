import type { PieceType } from "@/leaders/services/game.types";

import { BLACK_CROWN_CELL_ID, WHITE_CROWN_CELL_ID } from "@/leaders/domain/board";
import { placePiece, type GameState } from "@/leaders/domain/game-state";
import { defaultRng, shuffle, type Rng } from "@/leaders/domain/rng";
import { beginTurnIfNeeded } from "@/leaders/domain/turn";

export const DECK_TYPES: readonly PieceType[] = [
  "SHAMAN",
  "SNIPER",
  "TACTICIAN",
  "WILL_O_THE_WISP",
  "ACROBAT",
  "RIDER",
  "BRUISER",
  "ROYAL_GUARD",
  "ILLUSIONIST",
  "CLAW_LAUNCHER",
  "MANIPULATOR",
  "WANDERER",
  "BREWMASTER",
  "ARCHER",
  "ASSASSIN",
  "JAILOR",
  "PROTECTOR",
  "VIZIER",
  "NEMESIS",
  "HERMIT",
  "CUB",
];

export interface OpeningPlayers {
  gameId: string;
  roomId: string;
  blackPlayerId: string;
  whitePlayerId: string;
  rng?: Rng;
}

export function createInitial(players: OpeningPlayers): GameState {
  const rng = players.rng ?? defaultRng();
  const firstPlayerColor = rng.nextBoolean() ? "BLACK" : "WHITE";
  const state: GameState = {
    gameId: players.gameId,
    roomId: players.roomId,
    version: 0,
    status: "IN_PROGRESS",
    winnerPlayerId: null,
    blackPlayerId: players.blackPlayerId,
    whitePlayerId: players.whitePlayerId,
    activeColor: firstPlayerColor,
    firstPlayerColor,
    turnNumber: 1,
    phase: "ACTION",
    recruitmentPhasesRemaining: 1,
    cellToPiece: {},
    pieces: {},
    faceUpOffers: [],
    deck: shuffle(DECK_TYPES, rng),
    blackHand: ["LEADER"],
    whiteHand: ["LEADER"],
    actedThisPhase: [],
    activeAbilityBlockedThisPhase: [],
    frogExpiresAfterOpponentTurn: {},
    resolvingNemesis: false,
    pendingAbility: null,
  };

  placePiece(state, "LEADER", "WHITE", WHITE_CROWN_CELL_ID, rng.nextId());
  placePiece(state, "LEADER", "BLACK", BLACK_CROWN_CELL_ID, rng.nextId());
  while (state.faceUpOffers.length < 3 && state.deck.length > 0) {
    const next = state.deck.shift();
    if (next) {
      state.faceUpOffers.push(next);
    }
  }
  beginTurnIfNeeded(state);
  return state;
}
