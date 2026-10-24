import { isLeaderDown, sniperWins } from "@/leaders/domain/capture";
import { opponent, playerIdFor, type GameState } from "@/leaders/domain/game-state";

export function declareWinner(state: GameState, playerId: string): void {
  state.status = "WON";
  state.winnerPlayerId = playerId;
}

/** Returns true when at least one piece stops being a frog. */
export function expireFrogs(state: GameState): boolean {
  let reverted = false;
  for (const [pieceId, turn] of Object.entries(state.frogExpiresAfterOpponentTurn)) {
    if (turn <= state.turnNumber) {
      const piece = state.pieces[pieceId];
      if (piece?.frog) {
        piece.frog = false;
        reverted = true;
      }
      delete state.frogExpiresAfterOpponentTurn[pieceId];
    }
  }
  return reverted;
}

function resolveWinsAfterFrogRevert(state: GameState): void {
  const active = state.activeColor;
  if (isLeaderDown(state, active)) {
    declareWinner(state, playerIdFor(state, opponent(active)));
    return;
  }
  if (isLeaderDown(state, opponent(active))) {
    declareWinner(state, playerIdFor(state, active));
  }
}

export function beginTurnIfNeeded(state: GameState): void {
  if (state.status !== "IN_PROGRESS") {
    return;
  }

  if (expireFrogs(state)) {
    resolveWinsAfterFrogRevert(state);
    if (state.status !== "IN_PROGRESS") {
      return;
    }
  }

  if (sniperWins(state, state.activeColor)) {
    declareWinner(state, playerIdFor(state, state.activeColor));
  }
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
  beginTurnIfNeeded(state);
}
