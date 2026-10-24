import type { BoardPiece, GameCommandRequest, GameLegalAction } from "@/leaders/services/game.types";

import { activeCandidateParams } from "@/leaders/domain/abilities";
import { encodeActionKey, type ResolvedCommand } from "@/leaders/domain/action-key";
import { CELLS, neighborIds } from "@/leaders/domain/board";
import { enemyJailorAdjacent } from "@/leaders/domain/capture";
import {
  findPieceOfType,
  opponent,
  piecesOf,
  playerIdFor,
  type GameState,
} from "@/leaders/domain/game-state";
import { apply } from "@/leaders/domain/rules";

interface Candidate {
  type: "DEFAULT_MOVE" | "ACTIVE_ABILITY";
  pieceId: string;
  targetCellId?: number;
  abilityParams?: Record<string, string | number | boolean>;
}

export function legalActionsFor(state: GameState): GameLegalAction[] {
  if (state.status !== "IN_PROGRESS" || state.phase !== "ACTION") {
    return [];
  }
  if (state.resolvingNemesis) {
    return nemesisActions(state);
  }
  if (state.pendingAbility) {
    return pendingActions(state);
  }

  const actions: GameLegalAction[] = [];
  const seen = new Set<string>();
  for (const piece of piecesOf(state)) {
    if (piece.owner !== state.activeColor || state.actedThisPhase.includes(piece.id)) {
      continue;
    }
    for (const candidate of defaultCandidates(piece)) {
      accept(state, candidate, piece, playerIdFor(state, state.activeColor), actions, seen);
    }
    const jailorBlocksActive =
      piece.type !== "WILL_O_THE_WISP" && enemyJailorAdjacent(state, piece);
    if (piece.frog || state.activeAbilityBlockedThisPhase.includes(piece.id) || jailorBlocksActive) {
      continue;
    }
    for (const params of activeCandidateParams(state, piece)) {
      accept(
        state,
        { type: "ACTIVE_ABILITY", pieceId: piece.id, abilityParams: params },
        piece,
        playerIdFor(state, state.activeColor),
        actions,
        seen,
      );
    }
  }
  return actions;
}

function pendingActions(state: GameState): GameLegalAction[] {
  const pending = state.pendingAbility;
  if (!pending) {
    return [];
  }
  const piece = state.pieces[pending.pieceId];
  if (!piece) {
    return [];
  }

  const actorId = playerIdFor(state, state.activeColor);
  const candidates: Candidate[] = [];

  if (pending.abilityId === "ACROBAT") {
    for (const other of piecesOf(state)) {
      if (other.id === piece.id) {
        continue;
      }
      candidates.push({
        type: "ACTIVE_ABILITY",
        pieceId: piece.id,
        abilityParams: { targetPieceId: other.id },
      });
    }
    candidates.push({
      type: "ACTIVE_ABILITY",
      pieceId: piece.id,
      abilityParams: { completeAcrobat: true },
    });
  } else if (pending.abilityId === "LEADER_VIZIER") {
    for (const cellId of neighborIds(piece.cellId)) {
      candidates.push({ type: "DEFAULT_MOVE", pieceId: piece.id, targetCellId: cellId });
    }
  } else if (pending.abilityId === "ROYAL_GUARD") {
    for (const cellId of neighborIds(piece.cellId)) {
      candidates.push({
        type: "ACTIVE_ABILITY",
        pieceId: piece.id,
        abilityParams: { targetCellId: cellId },
      });
    }
    candidates.push({
      type: "ACTIVE_ABILITY",
      pieceId: piece.id,
      abilityParams: { completeRoyalGuard: true },
    });
  } else if (pending.abilityId === "MANIPULATOR" && pending.prompt) {
    for (const cell of CELLS) {
      candidates.push({
        type: "ACTIVE_ABILITY",
        pieceId: piece.id,
        abilityParams: { targetPieceId: pending.prompt, targetCellId: cell.id },
      });
    }
  }

  const actions: GameLegalAction[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    accept(state, candidate, piece, actorId, actions, seen);
  }
  return actions;
}

function nemesisActions(state: GameState): GameLegalAction[] {
  const color = opponent(state.activeColor);
  const nemesis = findPieceOfType(state, color, "NEMESIS");
  if (!nemesis) {
    return [];
  }

  const actorId = playerIdFor(state, color);
  const actions: GameLegalAction[] = [];
  const seen = new Set<string>();
  for (const cell of CELLS) {
    accept(
      state,
      { type: "DEFAULT_MOVE", pieceId: nemesis.id, targetCellId: cell.id },
      nemesis,
      actorId,
      actions,
      seen,
    );
  }
  return actions;
}

function defaultCandidates(piece: BoardPiece): Candidate[] {
  if (piece.type === "NEMESIS" || piece.type === "WILL_O_THE_WISP") {
    return [];
  }

  const cells: number[] = [];
  if (piece.frog || piece.type === "LEADER") {
    for (const cell of CELLS) {
      const distance = axialDistanceSafe(piece.cellId, cell.id);
      if (distance === 1 || distance === 2) {
        cells.push(cell.id);
      }
    }
  } else {
    cells.push(...neighborIds(piece.cellId));
  }

  return cells.map((targetCellId) => ({
    type: "DEFAULT_MOVE" as const,
    pieceId: piece.id,
    targetCellId,
  }));
}

function axialDistanceSafe(fromId: number, toId: number): number {
  const from = CELLS[fromId];
  const to = CELLS[toId];
  if (!from || !to) {
    return Number.POSITIVE_INFINITY;
  }
  const dq = from.q - to.q;
  const dr = from.r - to.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

function accept(
  state: GameState,
  candidate: Candidate,
  piece: BoardPiece,
  actorId: string,
  actions: GameLegalAction[],
  seen: Set<string>,
): void {
  const request: GameCommandRequest = {
    type: candidate.type,
    expectedVersion: state.version,
    pieceId: candidate.pieceId,
    ...(candidate.targetCellId != null ? { targetCellId: candidate.targetCellId } : {}),
    ...(candidate.abilityParams ? { abilityParams: candidate.abilityParams } : {}),
  };

  try {
    apply(state, request, actorId);
  } catch {
    return;
  }

  const action = presentLegalAction(piece, {
    type: candidate.type,
    pieceId: candidate.pieceId,
    targetCellId: candidate.type === "DEFAULT_MOVE" ? candidate.targetCellId : undefined,
    abilityParams: candidate.abilityParams ?? {},
  });
  if (seen.has(action.actionKey)) {
    return;
  }
  seen.add(action.actionKey);
  actions.push(action);
}

export function presentLegalAction(piece: BoardPiece, command: ResolvedCommand): GameLegalAction {
  const params = command.abilityParams;
  const paramCell = typeof params.targetCellId === "number" ? params.targetCellId : undefined;
  const targetCellId = command.targetCellId ?? paramCell ?? null;
  const targetPieceId = typeof params.targetPieceId === "string" ? params.targetPieceId : null;
  const choiceGroup =
    params.mode != null && targetPieceId ? `CLAW:${targetPieceId}` : null;

  return {
    actionKey: encodeActionKey({
      type: command.type,
      pieceId: command.pieceId,
      targetCellId: command.targetCellId,
      abilityParams: params,
    }),
    type: command.type === "DEFAULT_MOVE" ? "DEFAULT_MOVE" : "ACTIVE_ABILITY",
    pieceId: piece.id,
    targetCellId: targetCellId ?? undefined,
    targetPieceId: targetPieceId ?? undefined,
    label: piece.type,
    choiceGroup: choiceGroup ?? undefined,
  };
}
