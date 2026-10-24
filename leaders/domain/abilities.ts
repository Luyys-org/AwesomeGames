import type { BoardPiece } from "@/leaders/services/game.types";

import type { ResolvedCommand } from "@/leaders/domain/action-key";
import {
  areAdjacent,
  axialDistance,
  directionIndex,
  isOnBoard,
  isVisible,
  lineBetween,
  neighborIds,
  pathClearExceptOrigin,
  stepBeyond,
} from "@/leaders/domain/board";
import { assertProtectorAllows } from "@/leaders/domain/capture";
import { IllegalGameMoveException } from "@/leaders/domain/errors";
import {
  findLeader,
  isOccupied,
  markActed,
  opponent,
  pieceAt,
  piecesOf,
  relocate,
  requirePiece,
  type GameState,
} from "@/leaders/domain/game-state";

type Params = ResolvedCommand["abilityParams"];

export function applyCharacterAbility(
  state: GameState,
  piece: BoardPiece,
  command: ResolvedCommand,
): void {
  const params = command.abilityParams;
  const cell = cellParam(command);

  switch (piece.type) {
    case "SHAMAN":
      shaman(state, piece, params);
      return;
    case "TACTICIAN":
      tactician(state, piece, params, cell);
      return;
    case "WILL_O_THE_WISP":
      willOWisp(state, piece, cell);
      return;
    case "ACROBAT":
      acrobat(state, piece, params);
      return;
    case "RIDER":
      rider(state, piece, cell);
      return;
    case "BRUISER":
      bruiser(state, piece, params, cell);
      return;
    case "ROYAL_GUARD":
      royalGuard(state, piece, params, cell);
      return;
    case "ILLUSIONIST":
      illusionist(state, piece, params);
      return;
    case "CLAW_LAUNCHER":
      claw(state, piece, params, cell);
      return;
    case "MANIPULATOR":
      manipulator(state, piece, params, cell);
      return;
    case "WANDERER":
      wanderer(state, piece, cell);
      return;
    case "BREWMASTER":
      brewmaster(state, piece, params, cell);
      return;
    case "LEADER":
      throw new IllegalGameMoveException("Leader has no active ability");
    case "NEMESIS":
      throw new IllegalGameMoveException("Nemesis cannot use active abilities");
    case "SNIPER":
    case "ARCHER":
    case "ASSASSIN":
    case "JAILOR":
    case "PROTECTOR":
    case "VIZIER":
    case "HERMIT":
    case "CUB":
      throw new IllegalGameMoveException(`${piece.type} has no active ability`);
    default:
      throw new IllegalGameMoveException(`No rules for ${piece.type}`);
  }
}

export function nemesisLandingCells(state: GameState, nemesis: BoardPiece): number[] {
  const landings: number[] = [];
  for (const cell of neighborIds(nemesis.cellId)) {
    const beyond = stepBeyond(nemesis.cellId, cell);
    if (beyond == null || isOccupied(state, cell) || isOccupied(state, beyond)) {
      continue;
    }
    landings.push(beyond);
  }
  return landings;
}

function shaman(state: GameState, piece: BoardPiece, params: Params): void {
  const target = requirePiece(state, requirePieceId(params));
  if (target.type === "LEADER") {
    throw new IllegalGameMoveException("Cannot frog the leader");
  }
  if (target.owner === piece.owner) {
    throw new IllegalGameMoveException("Target must be enemy");
  }
  if (!isVisible(piece.cellId, target.cellId, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Target not visible");
  }

  target.frog = true;
  // Expire after the opponent completes one full turn (action + recruitment).
  state.frogExpiresAfterOpponentTurn[target.id] = state.turnNumber + 2;
  markActed(state, piece.id);
}

function tactician(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  const enemyLeader = findLeader(state, opponent(piece.owner));
  if (!enemyLeader) {
    throw new IllegalGameMoveException("Enemy leader not found");
  }

  const pinned = neighborIds(enemyLeader.cellId).some((cellId) => {
    const other = pieceAt(state, cellId);
    return other != null && other.owner === piece.owner;
  });
  if (!pinned) {
    throw new IllegalGameMoveException("An ally must be adjacent to the enemy leader");
  }

  const ally = requirePiece(state, requirePieceId(params));
  if (ally.owner !== piece.owner || ally.type === "LEADER") {
    throw new IllegalGameMoveException("Must move non-leader ally");
  }

  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (!areAdjacent(ally.cellId, destination)) {
    throw new IllegalGameMoveException("Cells not adjacent");
  }
  if (isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Cell occupied");
  }

  relocate(state, ally.id, destination);
  if (!state.activeAbilityBlockedThisPhase.includes(ally.id)) {
    state.activeAbilityBlockedThisPhase.push(ally.id);
  }
  markActed(state, piece.id);
}

function willOWisp(state: GameState, piece: BoardPiece, cell: number | undefined): void {
  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Cell occupied");
  }

  relocate(state, piece.id, destination);
  markActed(state, piece.id);
}

function acrobat(state: GameState, piece: BoardPiece, params: Params): void {
  if (flag(params, "completeAcrobat")) {
    if (state.pendingAbility?.abilityId !== "ACROBAT" || state.pendingAbility.pieceId !== piece.id) {
      throw new IllegalGameMoveException("No acrobat jump to complete");
    }
    state.pendingAbility = null;
    markActed(state, piece.id);
    return;
  }

  if (state.pendingAbility && state.pendingAbility.pieceId !== piece.id) {
    throw new IllegalGameMoveException("Another ability is pending");
  }

  const over = requirePiece(state, requirePieceId(params));
  if (!isOccupied(state, over.cellId)) {
    throw new IllegalGameMoveException("Must jump over occupied cell");
  }
  if (!areAdjacent(piece.cellId, over.cellId)) {
    throw new IllegalGameMoveException("Acrobat jump must be exactly over one adjacent character");
  }

  const landing = acrobatLanding(piece.cellId, over.cellId);
  if (landing == null) {
    throw new IllegalGameMoveException("Acrobat jump must be exactly over one adjacent character");
  }
  if (isOccupied(state, landing)) {
    throw new IllegalGameMoveException("Landing must be empty");
  }

  const continuing = state.pendingAbility?.abilityId === "ACROBAT" && state.pendingAbility.pieceId === piece.id;
  relocate(state, piece.id, landing);

  if (continuing) {
    state.pendingAbility = null;
    markActed(state, piece.id);
    return;
  }

  if (acrobatJumpTargets(state, piece.cellId).length > 0) {
    state.pendingAbility = {
      pieceId: piece.id,
      abilityId: "ACROBAT",
      step: 1,
      prompt: "Second jump",
    };
    return;
  }

  markActed(state, piece.id);
}

function rider(state: GameState, piece: BoardPiece, cell: number | undefined): void {
  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Cell off board");
  }

  const line = lineBetween(piece.cellId, destination);
  if (axialDistance(piece.cellId, destination) !== 2 || line.length === 0) {
    throw new IllegalGameMoveException("Rider moves 2 in a straight line");
  }
  if (!pathClearExceptOrigin(line, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Path must be clear");
  }

  relocate(state, piece.id, destination);
  markActed(state, piece.id);
}

function bruiser(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  const enemy = requirePiece(state, requirePieceId(params));
  if (enemy.owner === piece.owner || !areAdjacent(piece.cellId, enemy.cellId)) {
    throw new IllegalGameMoveException("Must target enemy");
  }

  assertProtectorAllows(state, enemy);

  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Push cell off board");
  }
  if (!areAdjacent(enemy.cellId, destination)) {
    throw new IllegalGameMoveException("Push must be adjacent to enemy");
  }

  const towardBruiser = directionIndex(enemy.cellId, piece.cellId);
  const pushDirection = directionIndex(enemy.cellId, destination);
  if (towardBruiser == null || pushDirection == null) {
    throw new IllegalGameMoveException("Push must be to opposite hex adjacent to enemy");
  }

  const allowed = new Set([(towardBruiser + 2) % 6, (towardBruiser + 3) % 6, (towardBruiser + 4) % 6]);
  if (!allowed.has(pushDirection)) {
    throw new IllegalGameMoveException("Push must be to opposite hex adjacent to enemy");
  }
  if (isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Cell occupied");
  }

  const formerEnemyCell = enemy.cellId;
  relocate(state, enemy.id, destination);
  relocate(state, piece.id, formerEnemyCell);
  markActed(state, piece.id);
}

function royalGuard(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  if (flag(params, "completeRoyalGuard")) {
    if (
      state.pendingAbility?.abilityId !== "ROYAL_GUARD" ||
      state.pendingAbility.pieceId !== piece.id
    ) {
      throw new IllegalGameMoveException("No royal guard step to complete");
    }
    state.pendingAbility = null;
    markActed(state, piece.id);
    return;
  }

  const leader = findLeader(state, piece.owner);
  if (!leader) {
    throw new IllegalGameMoveException("Leader missing");
  }

  const continuing =
    state.pendingAbility?.abilityId === "ROYAL_GUARD" && state.pendingAbility.pieceId === piece.id;
  if (continuing) {
    const destination = requireCell(cell);
    if (
      !isOnBoard(destination) ||
      !areAdjacent(piece.cellId, destination) ||
      destination === leader.cellId ||
      isOccupied(state, destination)
    ) {
      throw new IllegalGameMoveException("Illegal royal guard second step");
    }
    relocate(state, piece.id, destination);
    state.pendingAbility = null;
    markActed(state, piece.id);
    return;
  }

  const first = requireCell(cell);
  if (!isOnBoard(first)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (!areAdjacent(leader.cellId, first) || isOccupied(state, first)) {
    throw new IllegalGameMoveException("Must move adjacent to leader first");
  }

  relocate(state, piece.id, first);

  const second = typeof params.secondCellId === "number" ? params.secondCellId : undefined;
  if (second != null) {
    if (!isOnBoard(second) || !areAdjacent(first, second) || isOccupied(state, second)) {
      throw new IllegalGameMoveException("Illegal royal guard second step");
    }
    relocate(state, piece.id, second);
    markActed(state, piece.id);
    return;
  }

  const followUps = neighborIds(piece.cellId).filter(
    (cellId) => cellId !== leader.cellId && !isOccupied(state, cellId),
  );
  if (followUps.length === 0) {
    markActed(state, piece.id);
    return;
  }

  state.pendingAbility = {
    pieceId: piece.id,
    abilityId: "ROYAL_GUARD",
    step: 1,
    prompt: "Optional step",
  };
}

function illusionist(state: GameState, piece: BoardPiece, params: Params): void {
  const target = requirePiece(state, requirePieceId(params));
  if (target.id === piece.id || !isVisible(piece.cellId, target.cellId, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Target not visible");
  }
  if (areAdjacent(piece.cellId, target.cellId)) {
    throw new IllegalGameMoveException("Target must not be adjacent");
  }
  if (target.owner !== piece.owner) {
    assertProtectorAllows(state, target);
  }

  const pieceCell = piece.cellId;
  const targetCell = target.cellId;
  piece.cellId = targetCell;
  target.cellId = pieceCell;
  state.cellToPiece[String(pieceCell)] = target.id;
  state.cellToPiece[String(targetCell)] = piece.id;
  markActed(state, piece.id);
}

function claw(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  const target = requirePiece(state, requirePieceId(params));
  const mode = params.mode === "drag" ? "drag" : "advance";
  if (!isVisible(piece.cellId, target.cellId, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Target not visible");
  }

  const line = lineBetween(piece.cellId, target.cellId);
  if (line.length < 2) {
    throw new IllegalGameMoveException("Target not visible");
  }

  const destination = requireCell(cell);
  if (mode === "drag") {
    if (line.length < 3 || destination !== line[1]) {
      throw new IllegalGameMoveException("Invalid drag destination");
    }
    for (let index = 2; index < line.length - 1; index += 1) {
      if (isOccupied(state, line[index])) {
        throw new IllegalGameMoveException("Invalid drag destination");
      }
    }
    if (isOccupied(state, destination)) {
      throw new IllegalGameMoveException("Invalid drag destination");
    }
    if (target.owner !== piece.owner) {
      assertProtectorAllows(state, target);
    }
    relocate(state, target.id, destination);
    markActed(state, piece.id);
    return;
  }

  if (destination !== line[line.length - 2] || isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Invalid advance cell");
  }

  relocate(state, piece.id, destination);
  markActed(state, piece.id);
}

function manipulator(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  const continuing =
    state.pendingAbility?.abilityId === "MANIPULATOR" && state.pendingAbility.pieceId === piece.id;
  const pendingTarget = continuing ? state.pendingAbility?.prompt : undefined;
  const requestedTarget = typeof params.targetPieceId === "string" ? params.targetPieceId : undefined;
  if (continuing && requestedTarget && pendingTarget && requestedTarget !== pendingTarget) {
    throw new IllegalGameMoveException("Target mismatch");
  }

  const targetId = pendingTarget ?? requestedTarget;
  if (!targetId) {
    throw new IllegalGameMoveException("targetPieceId is required");
  }

  const target = requirePiece(state, targetId);
  validateManipulatorTarget(state, piece, target);

  if (cell == null) {
    if (continuing) {
      throw new IllegalGameMoveException("targetCellId is required");
    }
    state.pendingAbility = {
      pieceId: piece.id,
      abilityId: "MANIPULATOR",
      step: 0,
      prompt: target.id,
    };
    return;
  }

  const destinations = manipulatorDestinations(state, target.cellId);
  if (!destinations.includes(cell)) {
    throw new IllegalGameMoveException("Destination must be an empty adjacent hex");
  }

  if (target.owner !== piece.owner) {
    assertProtectorAllows(state, target);
  }
  relocate(state, target.id, cell);
  state.pendingAbility = null;
  markActed(state, piece.id);
}

function wanderer(state: GameState, piece: BoardPiece, cell: number | undefined): void {
  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Cell occupied");
  }
  if (adjacentToEnemy(state, destination, piece.owner)) {
    throw new IllegalGameMoveException("Cannot land adjacent to enemy");
  }

  relocate(state, piece.id, destination);
  markActed(state, piece.id);
}

function brewmaster(state: GameState, piece: BoardPiece, params: Params, cell: number | undefined): void {
  const ally = requirePiece(state, requirePieceId(params));
  if (ally.owner !== piece.owner || !areAdjacent(piece.cellId, ally.cellId)) {
    throw new IllegalGameMoveException("Must move ally");
  }

  const destination = requireCell(cell);
  if (!isOnBoard(destination)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (!areAdjacent(ally.cellId, destination)) {
    throw new IllegalGameMoveException("Cells not adjacent");
  }
  if (isOccupied(state, destination)) {
    throw new IllegalGameMoveException("Cell occupied");
  }

  relocate(state, ally.id, destination);
  markActed(state, piece.id);
}

function validateManipulatorTarget(state: GameState, piece: BoardPiece, target: BoardPiece): void {
  if (target.owner === piece.owner) {
    throw new IllegalGameMoveException("Must target enemy");
  }
  if (areAdjacent(piece.cellId, target.cellId)) {
    throw new IllegalGameMoveException("Target must not be adjacent");
  }
  if (!isVisible(piece.cellId, target.cellId, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Target not visible");
  }
  assertProtectorAllows(state, target);
  if (manipulatorDestinations(state, target.cellId).length === 0) {
    throw new IllegalGameMoveException("Target cannot be moved");
  }
}

function manipulatorDestinations(state: GameState, targetCell: number): number[] {
  return neighborIds(targetCell).filter((cellId) => !isOccupied(state, cellId));
}

function acrobatLanding(fromId: number, overId: number): number | null {
  if (!areAdjacent(fromId, overId)) {
    return null;
  }
  return stepBeyond(fromId, overId);
}

function acrobatJumpTargets(state: GameState, fromCell: number): string[] {
  const targets: string[] = [];
  for (const cellId of neighborIds(fromCell)) {
    const over = pieceAt(state, cellId);
    if (!over) {
      continue;
    }
    const landing = acrobatLanding(fromCell, cellId);
    if (landing == null || isOccupied(state, landing)) {
      continue;
    }
    targets.push(over.id);
  }
  return targets;
}

function adjacentToEnemy(state: GameState, cellId: number, owner: BoardPiece["owner"]): boolean {
  return neighborIds(cellId).some((neighbor) => {
    const other = pieceAt(state, neighbor);
    return other != null && other.owner !== owner;
  });
}

function cellParam(command: ResolvedCommand): number | undefined {
  if (command.targetCellId != null) {
    return command.targetCellId;
  }
  const value = command.abilityParams.targetCellId;
  return typeof value === "number" ? value : undefined;
}

function requireCell(cell: number | undefined): number {
  if (cell == null) {
    throw new IllegalGameMoveException("targetCellId is required");
  }
  return cell;
}

function requirePieceId(params: Params): string {
  const value = params.targetPieceId;
  if (typeof value !== "string" || value.length === 0) {
    throw new IllegalGameMoveException("targetPieceId is required");
  }
  return value;
}

function flag(params: Params, key: string): boolean {
  const value = params[key];
  return value === true || value === "true";
}

export function activeCandidateParams(state: GameState, piece: BoardPiece): Params[] {
  switch (piece.type) {
    case "SHAMAN":
      return piecesOf(state)
        .filter((other) => other.id !== piece.id)
        .map((other) => ({ targetPieceId: other.id }));
    case "TACTICIAN":
      return piecesOf(state)
        .filter(
          (other) =>
            other.id !== piece.id && other.owner === piece.owner && other.type !== "LEADER",
        )
        .flatMap((ally) =>
          neighborIds(ally.cellId).map((cellId) => ({
            targetPieceId: ally.id,
            targetCellId: cellId,
          })),
        );
    case "WILL_O_THE_WISP":
    case "WANDERER":
    case "RIDER":
      return allCellParams();
    case "ACROBAT":
      return piecesOf(state)
        .filter((other) => other.id !== piece.id)
        .map((other) => ({ targetPieceId: other.id }));
    case "BRUISER":
      return piecesOf(state)
        .filter((other) => other.owner !== piece.owner)
        .flatMap((enemy) =>
          neighborIds(enemy.cellId).map((cellId) => ({
            targetPieceId: enemy.id,
            targetCellId: cellId,
          })),
        );
    case "ROYAL_GUARD":
      return allCellParams();
    case "ILLUSIONIST":
      return piecesOf(state)
        .filter((other) => other.id !== piece.id)
        .map((other) => ({ targetPieceId: other.id }));
    case "CLAW_LAUNCHER":
      return clawCandidates(state, piece);
    case "MANIPULATOR":
      return piecesOf(state)
        .filter((other) => other.owner !== piece.owner)
        .map((enemy) => ({ targetPieceId: enemy.id }));
    case "BREWMASTER":
      return piecesOf(state)
        .filter((other) => other.owner === piece.owner && other.id !== piece.id)
        .flatMap((ally) =>
          neighborIds(ally.cellId).map((cellId) => ({
            targetPieceId: ally.id,
            targetCellId: cellId,
          })),
        );
    default:
      return [];
  }
}

function allCellParams(): Params[] {
  const params: Params[] = [];
  for (let cellId = 0; cellId < 37; cellId += 1) {
    params.push({ targetCellId: cellId });
  }
  return params;
}

function clawCandidates(state: GameState, piece: BoardPiece): Params[] {
  const params: Params[] = [];
  for (const target of piecesOf(state)) {
    if (target.id === piece.id) {
      continue;
    }
    const line = lineBetween(piece.cellId, target.cellId);
    if (line.length >= 2) {
      params.push({
        targetPieceId: target.id,
        targetCellId: line[line.length - 2],
        mode: "advance",
      });
    }
    if (line.length >= 3) {
      params.push({
        targetPieceId: target.id,
        targetCellId: line[1],
        mode: "drag",
      });
    }
  }
  return params;
}
