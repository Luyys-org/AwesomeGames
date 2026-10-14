import type { GameCommandRejectionView } from "@/leaders/lib/parse-game-state";
import type { GameCommandRequest, GameStateView } from "@/leaders/services/game.types";

import {
  IllegalGameMoveException,
  StaleVersionException,
  ValidationException,
} from "@/leaders/domain/errors";
import type { GameState } from "@/leaders/domain/game-state";
import { legalActionsFor } from "@/leaders/domain/legal-actions";
import { defaultRng, type Rng } from "@/leaders/domain/rng";
import { apply } from "@/leaders/domain/rules";

export function commitCommand(
  state: GameState,
  request: GameCommandRequest,
  actorPlayerId: string,
  rng: Rng = defaultRng(),
): GameState {
  if (typeof request.expectedVersion !== "number") {
    throw new ValidationException("expectedVersion is required");
  }
  if (request.expectedVersion !== state.version) {
    throw new StaleVersionException(state.version);
  }

  const next = apply(state, request, actorPlayerId, rng);
  next.version = state.version + 1;
  return next;
}

export function tryCommit(
  state: GameState,
  request: GameCommandRequest,
  actorPlayerId: string,
  rng?: Rng,
): { ok: true; state: GameState } | { ok: false; rejection: GameCommandRejectionView } {
  try {
    return { ok: true, state: commitCommand(state, request, actorPlayerId, rng) };
  } catch (caught) {
    if (caught instanceof StaleVersionException) {
      return {
        ok: false,
        rejection: {
          code: "STALE_VERSION",
          message: caught.message,
          actualVersion: caught.actualVersion,
        },
      };
    }
    if (caught instanceof ValidationException) {
      return { ok: false, rejection: { code: "VALIDATION", message: caught.message } };
    }
    if (caught instanceof IllegalGameMoveException) {
      return { ok: false, rejection: { code: "ILLEGAL_MOVE", message: caught.message } };
    }
    throw caught;
  }
}

export function toGameStateView(state: GameState): GameStateView {
  const {
    activeAbilityBlockedThisPhase: _blocked,
    winnerPlayerId,
    pendingAbility,
    ...rest
  } = state;

  return {
    ...rest,
    winnerPlayerId,
    pendingAbility,
    legalActions: legalActionsFor(state),
  };
}
