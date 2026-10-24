export const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

export interface AxialCell {
  id: number;
  q: number;
  r: number;
}

const cells: AxialCell[] = [];
const byId = new Map<number, AxialCell>();
const byKey = new Map<string, AxialCell>();

function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

let nextId = 0;
for (let r = -3; r <= 3; r += 1) {
  const qMin = Math.max(-3, -r - 3);
  const qMax = Math.min(3, -r + 3);
  for (let q = qMin; q <= qMax; q += 1) {
    const cell = { id: nextId, q, r };
    cells.push(cell);
    byId.set(cell.id, cell);
    byKey.set(axialKey(q, r), cell);
    nextId += 1;
  }
}

export const CELLS: readonly AxialCell[] = cells;
export const CELL_COUNT = cells.length;

export const WHITE_CROWN_CELL_ID = 0;
export const BLACK_CROWN_CELL_ID = 36;

export const WHITE_RECRUITMENT_ZONE: readonly number[] = [0, 1, 2, 3, 4, 9, 15];
export const BLACK_RECRUITMENT_ZONE: readonly number[] = [36, 33, 34, 35, 32, 27, 21];

const whiteZone = new Set(WHITE_RECRUITMENT_ZONE);
const blackZone = new Set(BLACK_RECRUITMENT_ZONE);

export function getCell(cellId: number): AxialCell | undefined {
  return byId.get(cellId);
}

export function cellAt(q: number, r: number): AxialCell | undefined {
  return byKey.get(axialKey(q, r));
}

export function isOnBoard(cellId: number): boolean {
  return byId.has(cellId);
}

export function neighborIds(cellId: number): number[] {
  const cell = byId.get(cellId);
  if (!cell) {
    return [];
  }

  const neighbors: number[] = [];
  for (const direction of AXIAL_DIRECTIONS) {
    const next = byKey.get(axialKey(cell.q + direction.q, cell.r + direction.r));
    if (next) {
      neighbors.push(next.id);
    }
  }
  return neighbors;
}

export function areAdjacent(aId: number, bId: number): boolean {
  return neighborIds(aId).includes(bId);
}

export function directionIndex(fromId: number, toId: number): number | null {
  const from = byId.get(fromId);
  const to = byId.get(toId);
  if (!from || !to) {
    return null;
  }

  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const index = AXIAL_DIRECTIONS.findIndex((direction) => direction.q === dq && direction.r === dr);
  return index === -1 ? null : index;
}

export function axialDistance(aId: number, bId: number): number {
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }

  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function isStraightLine(aId: number, bId: number): boolean {
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b || aId === bId) {
    return false;
  }

  return a.q === b.q || a.r === b.r || a.q + a.r === b.q + b.r;
}

/** Inclusive. Empty when the cells are not on one straight line. */
export function lineBetween(aId: number, bId: number): number[] {
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) {
    return [];
  }
  if (aId === bId) {
    return [aId];
  }
  if (!isStraightLine(aId, bId)) {
    return [];
  }

  const distance = axialDistance(aId, bId);
  const stepQ = (b.q - a.q) / distance;
  const stepR = (b.r - a.r) / distance;
  const line = [aId];
  let q = a.q;
  let r = a.r;

  for (let step = 0; step < distance; step += 1) {
    q += stepQ;
    r += stepR;
    const next = byKey.get(axialKey(q, r));
    if (!next) {
      return [];
    }
    line.push(next.id);
  }

  return line;
}

export function isVisible(
  fromId: number,
  toId: number,
  occupied: (cellId: number) => boolean,
): boolean {
  if (fromId === toId) {
    return false;
  }

  const line = lineBetween(fromId, toId);
  if (line.length < 2) {
    return false;
  }

  for (let index = 1; index < line.length - 1; index += 1) {
    if (occupied(line[index])) {
      return false;
    }
  }

  return true;
}

export function pathClearExceptOrigin(
  line: readonly number[],
  occupied: (cellId: number) => boolean,
): boolean {
  for (let index = 1; index < line.length; index += 1) {
    if (occupied(line[index])) {
      return false;
    }
  }
  return true;
}

export function recruitmentZone(color: "BLACK" | "WHITE"): ReadonlySet<number> {
  return color === "WHITE" ? whiteZone : blackZone;
}

export function isRecruitmentCell(color: "BLACK" | "WHITE", cellId: number): boolean {
  return recruitmentZone(color).has(cellId);
}

/** Cell one step past `overId` coming from `fromId`. */
export function stepBeyond(fromId: number, overId: number): number | null {
  const from = byId.get(fromId);
  const over = byId.get(overId);
  if (!from || !over) {
    return null;
  }

  const next = byKey.get(axialKey(over.q + (over.q - from.q), over.r + (over.r - from.r)));
  return next?.id ?? null;
}
