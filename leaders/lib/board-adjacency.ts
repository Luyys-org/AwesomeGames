import { BOARD_CELLS, getBoardCellCenter } from "@/leaders/lib/board-config";

const ADJACENCY_HEX_RADIUS = 26;
const NEIGHBOR_CENTER_DISTANCE = Math.sqrt(3) * ADJACENCY_HEX_RADIUS;
const NEIGHBOR_DISTANCE_EPSILON = 0.5;

/** Cell IDs sharing an edge with `cellId` on the 37-hex board (matches layout topology). */
export function boardNeighborCellIds(cellId: number): readonly number[] {
  const center = getBoardCellCenter(cellId, ADJACENCY_HEX_RADIUS);
  const neighbors: number[] = [];

  for (const cell of BOARD_CELLS) {
    if (cell.id === cellId) {
      continue;
    }

    const otherCenter = getBoardCellCenter(cell.id, ADJACENCY_HEX_RADIUS);
    const distance = Math.hypot(center.x - otherCenter.x, center.y - otherCenter.y);

    if (Math.abs(distance - NEIGHBOR_CENTER_DISTANCE) <= NEIGHBOR_DISTANCE_EPSILON) {
      neighbors.push(cell.id);
    }
  }

  return neighbors;
}
