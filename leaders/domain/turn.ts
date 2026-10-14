import { sniperWins } from "@/leaders/domain/capture";
import { opponent, playerIdFor, type GameState } from "@/leaders/domain/game-state";

export function declareWinner(state: GameState, playerId: string): void {
  state.status = "WON";
  state.winnerPlayerId = playerId;
}

export function expireFrogs(state: GameState): void {
  for (const [pieceId, turn] of Object.entries(state.frogExpiresAfterOpponentTurn)) {
    if (turn <= state.turnNumber) {
      const piece = state.pieces[pieceId];
      if (piece) {
        piece.frog = false;
      }
      delete state.frogExpiresAfterOpponentTurn[pieceId];
    }
  }
}

export function beginTurnIfNeeded(state: GameState): void {
  if (state.status !== "IN_PROGRESS") {
    return;
  }

  if (sniperWins(state, state.activeColor)) {
    declareWinner(state, playerIdFor(state, state.activeColor));
    return;
  }

  expireFrogs(state);
}

export function advanceTurn(state: GameState): void {
  const next = opponent(state.activeColor);
  state.activeColor = next;
  state.turnNumber += 1;
  state.phase = "ACTION";
  state.actedThisPhase = [];
  state.activeAbilityBlockedThisPhase = [];
  state.pendingAbility = null;
  state.recruitmentPhasesRemaining =
    state.turnNumber === 2 && next !== state.firstPlayerColor ? 2 : 1;
  expireFrogs(state);
  beginTurnIfNeeded(state);
}
