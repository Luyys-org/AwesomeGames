import { describe, expect, it } from "vitest";

import {
  BLACK_CROWN_CELL_ID,
  BLACK_RECRUITMENT_ZONE,
  CELL_COUNT,
  CELLS,
  isRecruitmentCell,
  neighborIds,
  WHITE_CROWN_CELL_ID,
  WHITE_RECRUITMENT_ZONE,
} from "@/leaders/domain/board";
import { at } from "@/leaders/domain/fixtures";

describe("BoardTopologyTests", () => {
  it("has37Cells", () => {
    expect(CELL_COUNT).toBe(37);
    expect(CELLS).toHaveLength(37);
    expect(at(0, -3)).toBe(WHITE_CROWN_CELL_ID);
    expect(at(0, 3)).toBe(BLACK_CROWN_CELL_ID);
    expect(at(0, 0)).toBe(18);
  });

  it("recruitmentZonesMatchCanonicalCornerEdges", () => {
    expect(WHITE_RECRUITMENT_ZONE).toEqual([1, 2, 3, 4, 9, 15]);
    expect(BLACK_RECRUITMENT_ZONE).toEqual([33, 34, 35, 32, 27, 21]);
  });

  it("crownCellsAreNotRecruitmentCells", () => {
    expect(isRecruitmentCell("WHITE", WHITE_CROWN_CELL_ID)).toBe(false);
    expect(isRecruitmentCell("BLACK", BLACK_CROWN_CELL_ID)).toBe(false);
  });

  it("farBorderCellIsNotRecruitmentZone", () => {
    expect(at(3, -2)).toBe(8);
    expect(isRecruitmentCell("WHITE", 8)).toBe(false);
    expect(isRecruitmentCell("BLACK", 8)).toBe(false);
    expect(neighborIds(WHITE_CROWN_CELL_ID)).toHaveLength(3);
  });
});
