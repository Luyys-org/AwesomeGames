import {
  BLACK_CROWN_CELL_ID,
  getBoardCellCenter,
  mirrorBoardCellId,
  WHITE_CROWN_CELL_ID,
} from "@/leaders/lib/board-config";
import type { PieceColor } from "@/leaders/services/game.types";

export function viewerCrownCellId(viewerColor: PieceColor): number {
  return viewerColor === "WHITE" ? WHITE_CROWN_CELL_ID : BLACK_CROWN_CELL_ID;
}

/** Map server cell id → layout id for this viewer’s seat. */
export function displayCellId(cellId: number, viewerColor: PieceColor): number {
  return viewerColor === "WHITE" ? mirrorBoardCellId(cellId) : cellId;
}

/** Map layout / display cell id → server cell id for commands. */
export function sourceCellId(displayId: number, viewerColor: PieceColor): number {
  return viewerColor === "WHITE" ? mirrorBoardCellId(displayId) : displayId;
}

/** Viewer’s pieces render white; opponent’s render black. */
export function displayPieceColor(owner: PieceColor, viewerColor: PieceColor): PieceColor {
  return owner === viewerColor ? "WHITE" : "BLACK";
}

/** Rotate the board so the viewer’s crown corner points toward the bottom of the view. */
export function boardTiltDegrees(viewerColor: PieceColor, hexRadius: number): number {
  const crownLayoutId = displayCellId(viewerCrownCellId(viewerColor), viewerColor);
  const { x, y } = getBoardCellCenter(crownLayoutId, hexRadius);
  const angleRad = Math.atan2(y, x);
  const targetRad = Math.PI / 2;
  return ((targetRad - angleRad) * 180) / Math.PI;
}
