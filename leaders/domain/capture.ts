import {
  areAdjacent,
  axialDistance,
  isStraightLine,
  isVisible,
  neighborIds,
} from "@/leaders/domain/board";
import { IllegalGameMoveException } from "@/leaders/domain/errors";
import {
  findLeader,
  findPieceOfType,
  isOccupied,
  pieceAt,
  piecesOf,
  type GameState,
} from "@/leaders/domain/game-state";
import type { BoardPiece, PieceColor } from "@/leaders/services/game.types";

export function isLeaderCaptured(state: GameState, color: PieceColor): boolean {
  const leader = findLeader(state, color);
  if (!leader) {
    return true;
  }

  let captors = 0;
  for (const piece of piecesOf(state)) {
    if (piece.owner === color) {
      continue;
    }
    if (countsAsCaptor(state, piece, leader)) {
      captors += 1;
    }
  }

  if (captors >= 2) {
    return true;
  }

  for (const piece of piecesOf(state)) {
    if (piece.owner === color || piece.frog || piece.type !== "ASSASSIN") {
      continue;
    }
    if (areAdjacent(piece.cellId, leader.cellId)) {
      return true;
    }
  }

  return false;
}

export function isLeaderSurrounded(state: GameState, color: PieceColor): boolean {
  const leader = findLeader(state, color);
  if (!leader) {
    return true;
  }

  return neighborIds(leader.cellId).every((cellId) => isOccupied(state, cellId));
}

export function isLeaderDown(state: GameState, color: PieceColor): boolean {
  return isLeaderCaptured(state, color) || isLeaderSurrounded(state, color);
}

/** First sniper of that color, straight line, distance 3 or more. Visibility is not required. */
export function sniperWins(state: GameState, color: PieceColor): boolean {
  const sniper = findPieceOfType(state, color, "SNIPER");
  if (!sniper) {
    return false;
  }

  const leader = findLeader(state, opponentLeader(color));
  if (!leader) {
    return false;
  }
  if (!isStraightLine(sniper.cellId, leader.cellId)) {
    return false;
  }

  return axialDistance(sniper.cellId, leader.cellId) >= 3;
}

export function enemyJailorAdjacent(state: GameState, piece: BoardPiece): boolean {
  return neighborIds(piece.cellId).some((cellId) => {
    const other = pieceAt(state, cellId);
    return other != null && other.owner !== piece.owner && other.type === "JAILOR";
  });
}

export function assertProtectorAllows(state: GameState, target: BoardPiece): void {
  if (target.type === "PROTECTOR") {
    throw new IllegalGameMoveException("Protector blocks this move");
  }

  for (const cellId of neighborIds(target.cellId)) {
    const other = pieceAt(state, cellId);
    if (other && other.owner === target.owner && other.type === "PROTECTOR") {
      throw new IllegalGameMoveException("Protector blocks this move");
    }
  }
}

function opponentLeader(color: PieceColor): PieceColor {
  return color === "BLACK" ? "WHITE" : "BLACK";
}

function countsAsCaptor(state: GameState, piece: BoardPiece, leader: BoardPiece): boolean {
  if (piece.frog || piece.type === "WILL_O_THE_WISP" || piece.type === "CUB") {
    return false;
  }

  if (piece.type === "ARCHER") {
    return (
      !areAdjacent(piece.cellId, leader.cellId) &&
      isStraightLine(piece.cellId, leader.cellId) &&
      axialDistance(piece.cellId, leader.cellId) === 2 &&
      isVisible(piece.cellId, leader.cellId, (cellId) => isOccupied(state, cellId))
    );
  }

  return areAdjacent(piece.cellId, leader.cellId);
}
