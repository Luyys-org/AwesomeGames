/** Row sizes top → bottom (37 cells). Must match backend board topology. */
export const BOARD_ROW_SIZES = [4, 5, 6, 7, 6, 5, 4] as const;

export const BOARD_CELL_COUNT = BOARD_ROW_SIZES.reduce((sum, n) => sum + n, 0);

export const WHITE_CROWN_CELL_ID = 0;
export const BLACK_CROWN_CELL_ID = 36;

export interface BoardCellLayout {
  id: number;
  row: number;
  col: number;
}

function buildCellLayouts(): BoardCellLayout[] {
  const cells: BoardCellLayout[] = [];
  let id = 0;

  for (let row = 0; row < BOARD_ROW_SIZES.length; row += 1) {
    const width = BOARD_ROW_SIZES[row];
    for (let col = 0; col < width; col += 1) {
      cells.push({ id, row, col });
      id += 1;
    }
  }

  return cells;
}

export const BOARD_CELLS: BoardCellLayout[] = buildCellLayouts();

const cellById = new Map(BOARD_CELLS.map((cell) => [cell.id, cell]));

export function getBoardCell(cellId: number): BoardCellLayout | undefined {
  return cellById.get(cellId);
}

/** Mirror through the board center (180°). Used when white faces the board from the bottom. */
export function mirrorBoardCellId(cellId: number): number {
  const cell = getBoardCell(cellId);
  if (!cell) {
    return cellId;
  }

  const mirroredRow = BOARD_ROW_SIZES.length - 1 - cell.row;
  const mirroredCol = BOARD_ROW_SIZES[mirroredRow] - 1 - cell.col;

  let mirroredId = 0;
  for (let row = 0; row < mirroredRow; row += 1) {
    mirroredId += BOARD_ROW_SIZES[row];
  }
  mirroredId += mirroredCol;

  return mirroredId;
}

/** White crown plus three hexes along the top row and three down the left edge. */
export const WHITE_RECRUITMENT_ZONE_CELL_IDS: readonly number[] = [
  0, 1, 2, 3, 4, 9, 15,
];

/** Black crown plus three hexes along the bottom row and three up the right edge. */
export const BLACK_RECRUITMENT_ZONE_CELL_IDS: readonly number[] = [
  36, 33, 34, 35, 32, 27, 21,
];

export function recruitmentZoneCellIdsForColor(
  color: "BLACK" | "WHITE",
): readonly number[] {
  return color === "WHITE"
    ? WHITE_RECRUITMENT_ZONE_CELL_IDS
    : BLACK_RECRUITMENT_ZONE_CELL_IDS;
}

const SQRT3 = Math.sqrt(3);

/** Flat-top hex layout; coordinates centered in the SVG view box. */
export function getBoardCellCenter(cellId: number, hexRadius: number): { x: number; y: number } {
  const cell = getBoardCell(cellId);
  if (!cell) {
    return { x: 0, y: 0 };
  }

  const maxCols = Math.max(...BOARD_ROW_SIZES);
  const rowWidth = BOARD_ROW_SIZES[cell.row];
  const rowOffsetCols = (maxCols - rowWidth) / 2;

  const x = hexRadius * SQRT3 * (rowOffsetCols + cell.col + 1);
  const y = hexRadius * 1.5 * (cell.row + 1);

  const boardWidth = hexRadius * SQRT3 * (maxCols + 1);
  const boardHeight = hexRadius * 1.5 * (BOARD_ROW_SIZES.length + 1);

  return {
    x: x - boardWidth / 2,
    y: y - boardHeight / 2,
  };
}

export function flatTopHexPoints(hexRadius: number): string {
  const points: string[] = [];

  for (let i = 0; i < 6; i += 1) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = hexRadius * Math.cos(angleRad);
    const y = hexRadius * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }

  return points.join(" ");
}
