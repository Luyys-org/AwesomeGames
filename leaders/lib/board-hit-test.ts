import { BOARD_CELLS, getBoardCellCenter } from "@/leaders/lib/board-config";
import { boardTiltDegrees, displayCellId } from "@/leaders/lib/board-presentation";
import type { PieceColor } from "@/leaders/services/game.types";

/** Map a screen pointer position to SVG user units (viewBox space). */
export function boardPointFromSvgPointer(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { x: 0, y: 0 };
  }
  const svgPoint = pt.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

function untiltPoint(x: number, y: number, tiltDeg: number): { x: number; y: number } {
  if (tiltDeg === 0) {
    return { x, y };
  }
  const rad = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/** Nearest server cell id under a pointer in SVG coordinates, or null if off-board. */
export function nearestBoardCellId(
  svgX: number,
  svgY: number,
  hexRadius: number,
  viewerColor: PieceColor,
): number | null {
  const tilt = boardTiltDegrees(viewerColor, hexRadius);
  const { x, y } = untiltPoint(svgX, svgY, tilt);

  let bestSourceId: number | null = null;
  let bestDist = Infinity;

  for (const cell of BOARD_CELLS) {
    const shownId = displayCellId(cell.id, viewerColor);
    const { x: cx, y: cy } = getBoardCellCenter(shownId, hexRadius);
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestSourceId = cell.id;
    }
  }

  if (bestSourceId === null || bestDist > hexRadius * 1.15) {
    return null;
  }

  return bestSourceId;
}
