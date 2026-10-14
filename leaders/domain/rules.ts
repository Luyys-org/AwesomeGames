import type { GameCommandRequest, PieceColor, PieceType } from "@/leaders/services/game.types";

import { applyCharacterAbility, nemesisLandingCells } from "@/leaders/domain/abilities";
import { resolveCommand, type ResolvedCommand } from "@/leaders/domain/action-key";
import {
  areAdjacent,
  axialDistance,
  BLACK_CROWN_CELL_ID,
  isOnBoard,
  isRecruitmentCell,
  lineBetween,
  neighborIds,
  pathClearExceptOrigin,
  recruitmentZone,
  WHITE_CROWN_CELL_ID,
} from "@/leaders/domain/board";
import { enemyJailorAdjacent, isLeaderDown } from "@/leaders/domain/capture";
import { IllegalGameMoveException } from "@/leaders/domain/errors";
import {
  cloneState,
  colorOfPlayer,
  consumeVizierPassive,
  findLeader,
  findPieceOfType,
  handOf,
  isOccupied,
  markActed,
  opponent,
  pieceAt,
  piecesOf,
  placePiece,
  playerIdFor,
  relocate,
  requirePiece,
  type GameState,
} from "@/leaders/domain/game-state";
import { defaultRng, type Rng } from "@/leaders/domain/rng";
import { advanceTurn, declareWinner } from "@/leaders/domain/turn";

export function apply(
  state: GameState,
  request: GameCommandRequest,
  actorPlayerId: string,
  rng: Rng = defaultRng(),
): GameState {
  if (state.status !== "IN_PROGRESS") {
    throw new IllegalGameMoveException("Game is finished");
  }

  const actor = colorOfPlayer(state, actorPlayerId);
  const command = resolveCommand(request);

  if (state.resolvingNemesis) {
    const next = cloneState(state);
    applyNemesis(next, actorPlayerId, command);
    return next;
  }

  if (actor !== state.activeColor) {
    throw new IllegalGameMoveException("Not your turn");
  }

  const next = cloneState(state);
  switch (command.type) {
    case "END_ACTION_PHASE":
      applyEndAction(next);
      break;
    case "RECRUIT":
      applyRecruit(next, state, actor, command, rng);
      break;
    case "DEFAULT_MOVE":
      applyDefault(next, actor, command);
      break;
    case "ACTIVE_ABILITY":
      applyActive(next, actor, command);
      break;
    default:
      throw new IllegalGameMoveException("type or actionKey is required");
  }

  if (
    next.status !== "WON" &&
    next.turnNumber === state.turnNumber &&
    next.activeColor === state.activeColor &&
    newlyUnsafe(state, next, actor)
  ) {
    throw new IllegalGameMoveException("Move would leave your leader captured or surrounded");
  }

  return next;
}

function newlyUnsafe(before: GameState, after: GameState, color: PieceColor): boolean {
  return !isLeaderDown(before, color) && isLeaderDown(after, color);
}

function applyEndAction(state: GameState): void {
  if (state.phase !== "ACTION") {
    throw new IllegalGameMoveException("Not in action phase");
  }

  state.actedThisPhase = [];
  state.activeAbilityBlockedThisPhase = [];
  state.pendingAbility = null;
  state.phase = "RECRUITMENT";

  const hand = handOf(state, state.activeColor);
  const offerIsLegal = state.faceUpOffers.some((offer) => canRecruitOffer(state, state.activeColor, offer));
  if (hand.length >= 5 || !offerIsLegal) {
    state.recruitmentPhasesRemaining -= 1;
    if (state.recruitmentPhasesRemaining <= 0) {
      endFullTurn(state);
    }
  }
}

function endFullTurn(state: GameState): void {
  const active = state.activeColor;
  if (isLeaderDown(state, active)) {
    throw new IllegalGameMoveException("Move would leave your leader captured or surrounded");
  }
  if (isLeaderDown(state, opponent(active))) {
    declareWinner(state, playerIdFor(state, active));
    return;
  }
  advanceTurn(state);
}

function applyRecruit(
  state: GameState,
  before: GameState,
  color: PieceColor,
  command: ResolvedCommand,
  rng: Rng,
): void {
  if (state.phase !== "RECRUITMENT") {
    throw new IllegalGameMoveException("Not in recruitment phase");
  }

  const offerIndex = command.offerIndex ?? paramNumber(command.abilityParams.offerIndex);
  const targetCellId = command.targetCellId ?? paramNumber(command.abilityParams.targetCellId);
  if (offerIndex == null || targetCellId == null) {
    throw new IllegalGameMoveException("Invalid recruit command");
  }
  if (!Number.isInteger(offerIndex) || offerIndex < 0 || offerIndex >= state.faceUpOffers.length) {
    throw new IllegalGameMoveException("Invalid offer index");
  }

  const hand = handOf(state, color);
  if (hand.length >= 5) {
    throw new IllegalGameMoveException("Hand full");
  }
  if (!isOnBoard(targetCellId)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (!isRecruitmentCell(color, targetCellId)) {
    throw new IllegalGameMoveException("Not a recruitment zone cell");
  }
  if (isOccupied(state, targetCellId)) {
    throw new IllegalGameMoveException("Cell occupied");
  }

  const offer = state.faceUpOffers[offerIndex];
  state.faceUpOffers.splice(offerIndex, 1);
  refillOffers(state);
  placePiece(state, offer, color, targetCellId, rng.nextId());
  hand.push(offer);

  if (offer === "HERMIT") {
    if (nonLeaderCount(hand) >= 4) {
      throw new IllegalGameMoveException("Hermit recruitment not allowed");
    }
    const cubCell = cubPlacementCell(state, color, targetCellId);
    if (cubCell == null) {
      throw new IllegalGameMoveException("No cub placement available");
    }
    placePiece(state, "CUB", color, cubCell, rng.nextId());
    hand.push("CUB");
  }

  consumeRecruitment(state, before);
}

function consumeRecruitment(state: GameState, before: GameState): void {
  state.recruitmentPhasesRemaining -= 1;
  const active = state.activeColor;

  if (state.recruitmentPhasesRemaining > 0) {
    if (newlyUnsafe(before, state, active)) {
      throw new IllegalGameMoveException("Move would leave your leader captured or surrounded");
    }
    return;
  }

  if (isLeaderDown(state, opponent(active))) {
    declareWinner(state, playerIdFor(state, active));
    return;
  }
  if (isLeaderDown(state, active) && !isLeaderDown(before, active)) {
    throw new IllegalGameMoveException("Move would leave your leader captured or surrounded");
  }
  advanceTurn(state);
}

export function canRecruitOffer(state: GameState, color: PieceColor, offer: PieceType): boolean {
  const emptyZone = [...recruitmentZone(color)].filter((cellId) => !isOccupied(state, cellId));
  if (emptyZone.length === 0) {
    return false;
  }
  if (offer !== "HERMIT") {
    return true;
  }
  if (nonLeaderCount(handOf(state, color)) >= 4) {
    return false;
  }
  return emptyZone.some((cellId) => cubPlacementCell(state, color, cellId) != null);
}

export function cubPlacementCell(state: GameState, color: PieceColor, hermitCell: number): number | null {
  const zone = recruitmentZone(color);
  for (const neighbor of neighborIds(hermitCell)) {
    if (!zone.has(neighbor) || isOccupied(state, neighbor)) {
      continue;
    }
    return neighbor;
  }
  return null;
}

function refillOffers(state: GameState): void {
  while (state.faceUpOffers.length < 3 && state.deck.length > 0) {
    const next = state.deck.shift();
    if (next) {
      state.faceUpOffers.push(next);
    }
  }
}

function nonLeaderCount(hand: readonly PieceType[]): number {
  return hand.filter((type) => type !== "LEADER").length;
}

function applyDefault(state: GameState, color: PieceColor, command: ResolvedCommand): void {
  if (state.phase !== "ACTION") {
    throw new IllegalGameMoveException("Not in action phase");
  }
  if (!command.pieceId || command.targetCellId == null) {
    throw new IllegalGameMoveException("Invalid move command");
  }

  const piece = requirePiece(state, command.pieceId);
  if (piece.owner !== color) {
    throw new IllegalGameMoveException("Not your piece");
  }
  if (state.pendingAbility && state.pendingAbility.pieceId !== piece.id) {
    throw new IllegalGameMoveException("Complete pending ability first");
  }
  if (state.actedThisPhase.includes(piece.id)) {
    throw new IllegalGameMoveException("Piece already acted");
  }

  const target = command.targetCellId;
  if (!isOnBoard(target)) {
    throw new IllegalGameMoveException("Cell off board");
  }

  if (state.pendingAbility?.abilityId === "LEADER_VIZIER" && state.pendingAbility.pieceId === piece.id) {
    if (piece.type !== "LEADER") {
      throw new IllegalGameMoveException("Not a leader");
    }
    if (!areAdjacent(piece.cellId, target) || isOccupied(state, target)) {
      throw new IllegalGameMoveException("Illegal default move");
    }
    const from = piece.cellId;
    relocate(state, piece.id, target);
    state.pendingAbility = null;
    markActed(state, piece.id);
    consumeVizierPassive(state, piece.owner);
    maybeArmNemesis(state, piece, from);
    return;
  }

  if (state.pendingAbility) {
    throw new IllegalGameMoveException("Complete pending ability first");
  }
  if (piece.type === "NEMESIS" || piece.type === "WILL_O_THE_WISP") {
    throw new IllegalGameMoveException("Piece cannot default move");
  }

  if (piece.frog) {
    const distance = axialDistance(piece.cellId, target);
    if (distance > 2) {
      throw new IllegalGameMoveException("Frog move too far");
    }
    if (distance === 0 || isOccupied(state, target)) {
      throw new IllegalGameMoveException("Cell occupied");
    }
    const from = piece.cellId;
    relocate(state, piece.id, target);
    markActed(state, piece.id);
    maybeArmNemesis(state, piece, from);
    return;
  }

  if (piece.type === "LEADER") {
    applyLeaderDefault(state, piece, target);
    return;
  }

  if (!areAdjacent(piece.cellId, target) || isOccupied(state, target)) {
    throw new IllegalGameMoveException("Illegal default move");
  }

  relocate(state, piece.id, target);
  markActed(state, piece.id);
}

function applyLeaderDefault(state: GameState, leader: GameState["pieces"][string], target: number): void {
  const from = leader.cellId;
  if (isOccupied(state, target)) {
    throw new IllegalGameMoveException("Illegal default move");
  }

  const distance = axialDistance(from, target);
  if (distance === 1 && areAdjacent(from, target)) {
    relocate(state, leader.id, target);
    if (playerHasVizier(state, leader.owner)) {
      state.pendingAbility = {
        pieceId: leader.id,
        abilityId: "LEADER_VIZIER",
        step: 1,
        prompt: "Vizier step",
      };
    } else {
      markActed(state, leader.id);
    }
    maybeArmNemesis(state, leader, from);
    return;
  }

  if (distance === 2 && playerHasVizier(state, leader.owner) && vizierLeapOk(state, from, target)) {
    relocate(state, leader.id, target);
    markActed(state, leader.id);
    consumeVizierPassive(state, leader.owner);
    maybeArmNemesis(state, leader, from);
    return;
  }

  throw new IllegalGameMoveException("Illegal default move");
}

function playerHasVizier(state: GameState, color: PieceColor): boolean {
  if (handOf(state, color).includes("VIZIER")) {
    return true;
  }
  return piecesOf(state).some((piece) => piece.owner === color && piece.type === "VIZIER");
}

function vizierLeapOk(state: GameState, from: number, target: number): boolean {
  if (from === target || areAdjacent(from, target) || axialDistance(from, target) !== 2) {
    return false;
  }
  return neighborIds(from).some((midpoint) => !isOccupied(state, midpoint) && areAdjacent(midpoint, target));
}

function maybeArmNemesis(state: GameState, mover: GameState["pieces"][string], fromCell: number): void {
  if (mover.type !== "LEADER" || mover.cellId === fromCell) {
    return;
  }
  const nemesis = findPieceOfType(state, opponent(mover.owner), "NEMESIS");
  if (!nemesis || nemesisLandingCells(state, nemesis).length === 0) {
    return;
  }
  state.resolvingNemesis = true;
}

function applyActive(state: GameState, color: PieceColor, command: ResolvedCommand): void {
  if (state.phase !== "ACTION") {
    throw new IllegalGameMoveException("Not in action phase");
  }

  const piece = requirePiece(state, command.pieceId);
  if (piece.owner !== color) {
    throw new IllegalGameMoveException("Not your piece");
  }
  if (state.actedThisPhase.includes(piece.id)) {
    throw new IllegalGameMoveException("Piece already acted");
  }

  const continuing = state.pendingAbility?.pieceId === piece.id;
  if (!continuing) {
    if (piece.frog) {
      throw new IllegalGameMoveException("Frogged piece cannot use active abilities");
    }
    if (state.activeAbilityBlockedThisPhase.includes(piece.id)) {
      throw new IllegalGameMoveException("Active ability blocked this turn");
    }
    if (enemyJailorAdjacent(state, piece)) {
      throw new IllegalGameMoveException("Jailor blocks active abilities");
    }
    if (state.pendingAbility) {
      throw new IllegalGameMoveException("Complete pending ability first");
    }
  }

  applyCharacterAbility(state, piece, command);
}

function applyNemesis(state: GameState, actorPlayerId: string, command: ResolvedCommand): void {
  if (command.type !== "DEFAULT_MOVE") {
    throw new IllegalGameMoveException("Nemesis resolution requires a move command");
  }

  const ownerColor = opponent(state.activeColor);
  if (actorPlayerId !== playerIdFor(state, ownerColor)) {
    throw new IllegalGameMoveException("Only Nemesis owner may move during Nemesis resolution");
  }

  const piece = requirePiece(state, command.pieceId);
  if (piece.owner !== ownerColor) {
    throw new IllegalGameMoveException("Must move your Nemesis");
  }
  if (piece.type !== "NEMESIS") {
    throw new IllegalGameMoveException("Not Nemesis");
  }

  const target = command.targetCellId;
  if (target == null) {
    throw new IllegalGameMoveException("Invalid move command");
  }
  if (!isOnBoard(target)) {
    throw new IllegalGameMoveException("Cell off board");
  }
  if (target === piece.cellId) {
    throw new IllegalGameMoveException("Nemesis must move to a different cell");
  }

  const line = lineBetween(piece.cellId, target);
  if (line.length === 0 || axialDistance(piece.cellId, target) !== 2) {
    throw new IllegalGameMoveException("Nemesis moves 2 in a straight line");
  }
  if (!pathClearExceptOrigin(line, (cellId) => isOccupied(state, cellId))) {
    throw new IllegalGameMoveException("Path must be clear");
  }

  relocate(state, piece.id, target);
  state.resolvingNemesis = false;
  resolveAfterNemesis(state);
}

function resolveAfterNemesis(state: GameState): void {
  const active = state.activeColor;
  if (isLeaderDown(state, active)) {
    declareWinner(state, playerIdFor(state, opponent(active)));
    return;
  }
  if (isLeaderDown(state, opponent(active))) {
    declareWinner(state, playerIdFor(state, active));
  }
}

function paramNumber(value: ResolvedCommand["abilityParams"][string] | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export const WHITE_CROWN = WHITE_CROWN_CELL_ID;
export const BLACK_CROWN = BLACK_CROWN_CELL_ID;
