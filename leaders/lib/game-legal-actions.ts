import { decodeActionKey } from "@/leaders/domain/action-key";
import { boardNeighborCellIds } from "@/leaders/lib/board-adjacency";
import { hasPieceActedThisPhase, pieceIdAtCell } from "@/leaders/lib/game-view-model";
import type { GameLegalAction, GameStateView } from "@/leaders/services/game.types";

/** Matches server `PendingAbility.abilityId` during Vizier leader step 2. */
export const LEADER_VIZIER_PENDING_ABILITY_ID = "LEADER_VIZIER";

/** Matches server `PendingAbility.abilityId` for Royal Guard (leader pick, then destination). */
export const ROYAL_GUARD_PENDING_ABILITY_ID = "ROYAL_GUARD";

/** Matches server `PendingAbility.abilityId` for Acrobat (optional second jump over a character). */
export const ACROBAT_PENDING_ABILITY_ID = "ACROBAT";

export interface AbilityHighlightTargets {
  cellIds: number[];
  pieceIds: string[];
}

/** Server JSON may send `"targetCellId": null` instead of omitting the field. */
function actionTargetCellId(action: GameLegalAction): number | undefined {
  const cellId = action.targetCellId;
  return cellId == null ? undefined : cellId;
}

/** Piece the player must pick when the server names a cell (e.g. Manipulator, Illusionist). */
function abilityActionTargetPieceId(
  game: GameStateView,
  action: GameLegalAction,
): string | undefined {
  if (action.targetPieceId != null) {
    return action.targetPieceId;
  }

  const targetCellId = actionTargetCellId(action);
  if (targetCellId === undefined) {
    return undefined;
  }

  return pieceIdAtCell(game, targetCellId) ?? undefined;
}

function abilityActionSelectsPieceTarget(
  game: GameStateView,
  action: GameLegalAction,
): boolean {
  if (action.targetPieceId != null && actionTargetCellId(action) === undefined) {
    return true;
  }

  const targetCellId = actionTargetCellId(action);
  if (targetCellId === undefined || action.targetPieceId != null) {
    return false;
  }

  return pieceIdAtCell(game, targetCellId) !== null;
}

export function legalActionsForPiece(
  game: GameStateView,
  pieceId: string,
  type: GameLegalAction["type"],
): GameLegalAction[] {
  const actions = game.legalActions;
  if (!actions || actions.length === 0) {
    return [];
  }

  const pendingPieceId = game.pendingAbility?.pieceId;
  if (hasPieceActedThisPhase(game, pieceId) && pendingPieceId !== pieceId) {
    return [];
  }

  let filtered = actions.filter(
    (action) => action.pieceId === pieceId && action.type === type,
  );

  if (
    type === "DEFAULT_MOVE" &&
    game.pendingAbility?.abilityId === LEADER_VIZIER_PENDING_ABILITY_ID &&
    pendingPieceId === pieceId
  ) {
    const leaderCellId = game.pieces?.[pieceId]?.cellId;
    if (leaderCellId !== undefined) {
      const adjacentOnly = new Set(boardNeighborCellIds(leaderCellId));
      filtered = filtered.filter(
        (action) =>
          action.targetCellId === undefined || adjacentOnly.has(action.targetCellId),
      );
    }
  }

  return filtered;
}

/** Default-move destination cells for drag-and-drop (from server `legalActions` only). */
export function legalDefaultMoveCellIds(game: GameStateView, pieceId: string): number[] {
  const cellIds = legalActionsForPiece(game, pieceId, "DEFAULT_MOVE")
    .map((action) => action.targetCellId)
    .filter((cellId): cellId is number => cellId !== undefined);

  return [...new Set(cellIds)];
}

export interface LegalAbilityHighlightOptions {
  /**
   * When false (default), omit hexes tied to a piece target (e.g. Bruiser push
   * destinations) until that piece has been chosen. Enable during server
   * `pendingAbility` follow-up steps.
   */
  includePiecePairedCellTargets?: boolean;
}

export function legalAbilityHighlights(
  game: GameStateView,
  pieceId: string,
  options: LegalAbilityHighlightOptions = {},
): AbilityHighlightTargets {
  const actions = legalActionsForPiece(game, pieceId, "ACTIVE_ABILITY");
  const cellIds = new Set<number>();
  const pieceIds = new Set<string>();
  const includePiecePairedCellTargets = options.includePiecePairedCellTargets ?? false;

  for (const action of actions) {
    const targetCellId = actionTargetCellId(action);
    if (targetCellId !== undefined) {
      // Server JSON often sends `"targetPieceId": null`; only hide the hex when a piece is actually targeted (e.g. Bruiser push).
      const pairedWithPiece = action.targetPieceId != null;
      if (!pairedWithPiece || includePiecePairedCellTargets) {
        cellIds.add(targetCellId);
      }
    }
    const targetPieceId = abilityActionTargetPieceId(game, action);
    if (targetPieceId) {
      pieceIds.add(targetPieceId);
    }
  }

  return {
    cellIds: [...cellIds],
    pieceIds: [...pieceIds],
  };
}

export function hasLegalAbilityActions(game: GameStateView, pieceId: string): boolean {
  return legalActionsForPiece(game, pieceId, "ACTIVE_ABILITY").length > 0;
}

/** Server `completeAcrobat` / `completeRoyalGuard` rows (no hex or piece target). */
export function abilityCompletionOnlyActions(
  game: GameStateView,
  pieceId: string,
): GameLegalAction[] {
  return legalActionsForPiece(game, pieceId, "ACTIVE_ABILITY").filter(
    (action) => action.targetPieceId == null && actionTargetCellId(action) === undefined,
  );
}

function abilityActionSelectsHexTarget(action: GameLegalAction): boolean {
  return actionTargetCellId(action) !== undefined;
}

/** Active ability options that only name piece targets (e.g. Royal Guard → Leader, Acrobat jump-over). */
export function activeAbilityTargetsPiecesOnly(
  game: GameStateView,
  pieceId: string,
): boolean {
  const actions = legalActionsForPiece(game, pieceId, "ACTIVE_ABILITY");
  const targetingActions = actions.filter(
    (action) =>
      abilityActionSelectsPieceTarget(game, action) ||
      abilityActionSelectsHexTarget(action),
  );
  if (targetingActions.length === 0) {
    return false;
  }

  return targetingActions.every((action) => abilityActionSelectsPieceTarget(game, action));
}

/** Whether the server published any legal default move or active ability for this piece. */
export function pieceHasLegalActions(game: GameStateView, pieceId: string): boolean {
  return (
    legalDefaultMoveCellIds(game, pieceId).length > 0 ||
    hasLegalAbilityActions(game, pieceId)
  );
}

export function matchingLegalAbilityActions(
  game: GameStateView,
  pieceId: string,
  targetCellId?: number,
  targetPieceId?: string,
): GameLegalAction[] {
  return legalActionsForPiece(game, pieceId, "ACTIVE_ABILITY").filter((action) => {
    const actionTargetPieceId = abilityActionTargetPieceId(game, action);
    if (targetPieceId !== undefined && actionTargetPieceId === targetPieceId) {
      return true;
    }
    const actionCellId = actionTargetCellId(action);
    if (targetCellId !== undefined && actionCellId === targetCellId) {
      if (action.targetPieceId != null && actionCellId === undefined) {
        return false;
      }
      if (targetPieceId === undefined && actionTargetPieceId) {
        return false;
      }
      return true;
    }
    return false;
  });
}

export function findUniqueLegalAbilityAction(
  game: GameStateView,
  pieceId: string,
  targetCellId?: number,
  targetPieceId?: string,
): GameLegalAction | null {
  const matches = matchingLegalAbilityActions(game, pieceId, targetCellId, targetPieceId);
  if (matches.length !== 1) {
    return null;
  }
  return matches[0] ?? null;
}

export function isLegalDefaultMove(
  game: GameStateView,
  pieceId: string,
  targetCellId: number,
): boolean {
  return legalDefaultMoveCellIds(game, pieceId).includes(targetCellId);
}

export function matchingLegalDefaultMoveActions(
  game: GameStateView,
  pieceId: string,
  targetCellId: number,
): GameLegalAction[] {
  return legalActionsForPiece(game, pieceId, "DEFAULT_MOVE").filter(
    (action) => action.targetCellId === targetCellId,
  );
}

export function findUniqueLegalDefaultMoveAction(
  game: GameStateView,
  pieceId: string,
  targetCellId: number,
): GameLegalAction | null {
  const matches = matchingLegalDefaultMoveActions(game, pieceId, targetCellId);
  if (matches.length !== 1) {
    return null;
  }
  return matches[0] ?? null;
}

/** Empty cells that may be clicked or dropped on for this piece (default move + ability cell targets). */
export function legalInteractiveCellIds(game: GameStateView, pieceId: string): number[] {
  const pendingForThisPiece = game.pendingAbility?.pieceId === pieceId;
  const { cellIds: abilityCells } = legalAbilityHighlights(game, pieceId, {
    includePiecePairedCellTargets: pendingForThisPiece,
  });
  if (activeAbilityTargetsPiecesOnly(game, pieceId)) {
    return [...abilityCells];
  }
  if (
    pendingForThisPiece &&
    game.pendingAbility?.abilityId === LEADER_VIZIER_PENDING_ABILITY_ID
  ) {
    return legalDefaultMoveCellIds(game, pieceId);
  }
  if (pendingForThisPiece) {
    return [...abilityCells];
  }
  const moveCells = legalDefaultMoveCellIds(game, pieceId);
  return [...new Set([...moveCells, ...abilityCells])];
}

/** All server-published actions that resolve by tapping an empty hex (move + ability). */
export function matchingLegalActionsForCell(
  game: GameStateView,
  pieceId: string,
  targetCellId: number,
): GameLegalAction[] {
  return [
    ...matchingLegalDefaultMoveActions(game, pieceId, targetCellId),
    ...matchingLegalAbilityActions(game, pieceId, targetCellId, undefined),
  ];
}

export function legalActionChoiceLabel(action: GameLegalAction): string {
  try {
    const decoded = decodeActionKey(action.actionKey);
    if (decoded.abilityParams.completeVizier === true) {
      return "Stop after one step";
    }
    if (decoded.abilityParams.completeRoyalGuard === true) {
      return "Finish ability";
    }
    if (decoded.abilityParams.completeAcrobat === true) {
      return "Finish jump";
    }
    const mode = decoded.abilityParams.mode;
    if (mode === "advance") {
      return "Advance";
    }
    if (mode === "drag") {
      return "Drag";
    }
  } catch {
    // Fall through to generic ability label.
  }

  if (action.type === "DEFAULT_MOVE") {
    return "Move";
  }

  return "Use ability";
}

/** Multiple legal resolutions for one hex that are not Bruiser-style push picks. */
export function isSameHexActionChoice(
  actions: readonly GameLegalAction[],
): boolean {
  if (actions.length < 2) {
    return false;
  }
  return !abilityChoicesAreDistinctHexTargets(actions);
}

/** Multiple ability options that differ only by destination hex (e.g. Bruiser push). */
export function abilityChoicesAreDistinctHexTargets(
  actions: readonly GameLegalAction[],
): boolean {
  if (actions.length < 2) {
    return false;
  }

  if (!actions.every((action) => action.type === "ACTIVE_ABILITY")) {
    return false;
  }

  const cellIds = actions
    .map((action) => actionTargetCellId(action))
    .filter((cellId): cellId is number => cellId !== undefined);

  return cellIds.length === actions.length && new Set(cellIds).size === cellIds.length;
}

export function abilityChoiceTargetCellIds(actions: readonly GameLegalAction[]): number[] {
  return [
    ...new Set(
      actions
        .map((action) => actionTargetCellId(action))
        .filter((cellId): cellId is number => cellId !== undefined),
    ),
  ];
}

export function findUniqueAbilityChoiceForCell(
  actions: readonly GameLegalAction[],
  targetCellId: number,
): GameLegalAction | null {
  const matches = actions.filter(
    (action) => actionTargetCellId(action) === targetCellId,
  );
  if (matches.length !== 1) {
    return null;
  }

  return matches[0] ?? null;
}
