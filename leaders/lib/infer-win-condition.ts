import { axialDistance } from "@/leaders/domain/board";
import {
  isLeaderCaptured,
  isLeaderSurrounded,
  sniperWins,
} from "@/leaders/domain/capture";
import { colorOfPlayer, opponent, type GameState } from "@/leaders/domain/game-state";
import type { GameStateView } from "@/leaders/services/game.types";

export type GameWinCondition = "SNIPER_LINE" | "LEADER_SURROUNDED" | "LEADER_CAPTURED" | "UNKNOWN";

export function winConditionLabel(condition: GameWinCondition): string {
  switch (condition) {
    case "SNIPER_LINE":
      return "Sniper line to enemy Leader";
    case "LEADER_SURROUNDED":
      return "Enemy Leader surrounded";
    case "LEADER_CAPTURED":
      return "Enemy Leader captured";
    default:
      return "Unknown";
  }
}

export function gameStateViewToDomainState(view: GameStateView): GameState {
  return {
    gameId: view.gameId,
    roomId: view.roomId,
    version: view.version,
    status: view.status,
    winnerPlayerId: view.winnerPlayerId ?? null,
    blackPlayerId: view.blackPlayerId,
    whitePlayerId: view.whitePlayerId,
    activeColor: view.activeColor,
    firstPlayerColor: view.firstPlayerColor,
    turnNumber: view.turnNumber,
    phase: view.phase,
    recruitmentPhasesRemaining: view.recruitmentPhasesRemaining ?? 0,
    cellToPiece: view.cellToPiece ?? {},
    pieces: view.pieces ?? {},
    faceUpOffers: view.faceUpOffers ?? [],
    deck: view.deck ?? [],
    blackHand: view.blackHand ?? [],
    whiteHand: view.whiteHand ?? [],
    actedThisPhase: view.actedThisPhase ?? [],
    activeAbilityBlockedThisPhase: [],
    frogExpiresAfterOpponentTurn: view.frogExpiresAfterOpponentTurn ?? {},
    resolvingNemesis: view.resolvingNemesis ?? false,
    pendingAbility: view.pendingAbility ?? null,
  };
}

export function inferWinCondition(game: GameStateView): GameWinCondition {
  if (game.status !== "WON" || game.winnerPlayerId == null) {
    return "UNKNOWN";
  }

  try {
    const state = gameStateViewToDomainState(game);
    const winnerColor = colorOfPlayer(state, game.winnerPlayerId);
    if (sniperWins(state, winnerColor)) {
      return "SNIPER_LINE";
    }
    const loserColor = opponent(winnerColor);
    if (isLeaderSurrounded(state, loserColor)) {
      return "LEADER_SURROUNDED";
    }
    if (isLeaderCaptured(state, loserColor)) {
      return "LEADER_CAPTURED";
    }
  } catch {
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

export { axialDistance };
