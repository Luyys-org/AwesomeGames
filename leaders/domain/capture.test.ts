import { describe, expect, it } from "vitest";

import { neighborIds } from "@/leaders/domain/board";
import { isLeaderCaptured, isLeaderSurrounded, sniperWins } from "@/leaders/domain/capture";
import { at, emptyState, put } from "@/leaders/domain/fixtures";
import { IllegalGameMoveException } from "@/leaders/domain/errors";
import { legalActionsFor } from "@/leaders/domain/legal-actions";
import { apply } from "@/leaders/domain/rules";
import { beginTurnIfNeeded } from "@/leaders/domain/turn";
import { command } from "@/leaders/domain/fixtures";

describe("CaptureEvaluatorTest", () => {
  it("leaderCapturedWithTwoAdjacentEnemies", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "BRUISER", "BLACK", at(1, 0));
    put(state, "RIDER", "BLACK", at(0, -1));
    expect(isLeaderCaptured(state, "WHITE")).toBe(true);
  });

  it("cubAndWispAndFrogDoNotCountAsCaptors", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "CUB", "BLACK", at(1, 0));
    put(state, "WILL_O_THE_WISP", "BLACK", at(0, -1));
    const frog = put(state, "BRUISER", "BLACK", at(-1, 0));
    frog.frog = true;
    expect(isLeaderCaptured(state, "WHITE")).toBe(false);
  });

  it("assassinAdjacentCapturesWithoutSecondCaptor", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "ASSASSIN", "BLACK", at(1, 0));
    expect(isLeaderCaptured(state, "WHITE")).toBe(true);
  });

  it("archerAtDistanceTwoCountsAsOneCaptorStillNeedsSecond", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "ARCHER", "BLACK", at(2, 0));
    expect(isLeaderCaptured(state, "WHITE")).toBe(false);
    put(state, "BRUISER", "BLACK", at(0, -1));
    expect(isLeaderCaptured(state, "WHITE")).toBe(true);
  });

  it("adjacentArcherDoesNotHelpCapture", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "ARCHER", "BLACK", at(1, 0));
    put(state, "BRUISER", "BLACK", at(0, -1));
    expect(isLeaderCaptured(state, "WHITE")).toBe(false);
  });

  it("leaderSurroundedWhenAllNeighborsOccupied", () => {
    const state = emptyState();
    const leader = at(0, 0);
    put(state, "LEADER", "WHITE", leader);
    for (const cellId of neighborIds(leader)) {
      put(state, "CUB", "WHITE", cellId);
    }
    expect(isLeaderSurrounded(state, "WHITE")).toBe(true);
  });

  it("leaderNotSurroundedWithOneEmptyNeighbor", () => {
    const state = emptyState();
    const leader = at(0, 0);
    put(state, "LEADER", "WHITE", leader);
    const neighbors = neighborIds(leader);
    for (const cellId of neighbors.slice(1)) {
      put(state, "CUB", "BLACK", cellId);
    }
    expect(isLeaderSurrounded(state, "WHITE")).toBe(false);
  });

  it("sniperWinsAtThreeOrMoreOnStraightLine", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "SNIPER", "BLACK", at(0, -3));
    expect(sniperWins(state, "BLACK")).toBe(true);
  });

  it("sniperDoesNotWinAtDistanceTwo", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "SNIPER", "BLACK", at(0, -2));
    expect(sniperWins(state, "BLACK")).toBe(false);
  });

  it("sniperDoesNotWinWhenAUnitStandsBetween", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "SNIPER", "BLACK", at(0, -3));
    put(state, "RIDER", "WHITE", at(0, -1));
    expect(sniperWins(state, "BLACK")).toBe(false);
  });

  it("sniperDoesNotWinWhenAFrogStandsBetween", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "SNIPER", "BLACK", at(0, -3));
    const blocker = put(state, "RIDER", "BLACK", at(0, -2));
    blocker.frog = true;
    expect(sniperWins(state, "BLACK")).toBe(false);
  });

  it("jailedSniperStillWinsOnAClearLine", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "SNIPER", "BLACK", at(0, -3));
    put(state, "JAILOR", "WHITE", at(1, -3));
    expect(sniperWins(state, "BLACK")).toBe(true);
  });

  it("jailedAssassinStillCaptures", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "ASSASSIN", "BLACK", at(1, 0));
    put(state, "JAILOR", "WHITE", at(2, 0));
    expect(isLeaderCaptured(state, "WHITE")).toBe(true);
  });
});

describe("GameRulesEngineWinTest", () => {
  it("captureDoesNotEndGameMidActionPhase", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    put(state, "LEADER", "WHITE", at(0, 0), "white-leader");
    put(state, "BRUISER", "BLACK", at(1, 0), "already");
    const mover = put(state, "RIDER", "BLACK", at(-2, 1), "mover");
    const next = apply(
      state,
      command({ type: "DEFAULT_MOVE", pieceId: mover.id, targetCellId: at(-1, 1) }),
      "black",
    );
    expect(isLeaderCaptured(next, "WHITE")).toBe(true);
    expect(next.status).toBe("IN_PROGRESS");
  });

  it("captureEndsGameWhenActionPhaseEndsWithFullHand", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "BRUISER", "RIDER", "ARCHER", "SNIPER"];
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    put(state, "LEADER", "WHITE", at(0, 0), "white-leader");
    put(state, "BRUISER", "BLACK", at(1, 0));
    put(state, "RIDER", "BLACK", at(0, -1));
    const next = apply(state, command({ type: "END_ACTION_PHASE" }), "black");
    expect(next.status).toBe("WON");
    expect(next.winnerPlayerId).toBe("black");
  });

  it("surroundEndsGameAtEndOfTurn", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "CUB", "HERMIT", "VIZIER", "SNIPER"];
    const leader = at(0, 0);
    put(state, "LEADER", "WHITE", leader, "white-leader");
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    for (const cellId of neighborIds(leader)) {
      put(state, "CUB", "BLACK", cellId);
    }
    const next = apply(state, command({ type: "END_ACTION_PHASE" }), "black");
    expect(next.status).toBe("WON");
    expect(next.winnerPlayerId).toBe("black");
  });

  it("sniperWinAtTurnStartBeforeActionPhase", () => {
    const state = emptyState({ activeColor: "BLACK" });
    put(state, "LEADER", "WHITE", at(0, 0));
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "SNIPER", "BLACK", at(0, -3));
    beginTurnIfNeeded(state);
    expect(state.status).toBe("WON");
    expect(state.winnerPlayerId).toBe("black");
  });

  it("winningRecruitmentDoesNotThrowLeaderSafety", () => {
    const state = emptyState({ phase: "RECRUITMENT" });
    const blackLeader = at(0, 3);
    put(state, "LEADER", "BLACK", blackLeader, "black-leader");
    put(state, "LEADER", "WHITE", at(0, 0), "white-leader");
    put(state, "BRUISER", "BLACK", at(1, 0));
    put(state, "RIDER", "BLACK", at(-1, 0));
    const neighbors = neighborIds(blackLeader);
    const recruitCell = neighbors.find((cellId) => cellId === 35);
    expect(recruitCell).toBe(35);
    for (const cellId of neighbors) {
      if (cellId !== 35) {
        put(state, "CUB", "WHITE", cellId);
      }
    }
    state.faceUpOffers = ["SNIPER"];
    const next = apply(
      state,
      command({ type: "RECRUIT", offerIndex: 0, targetCellId: 35 }),
      "black",
    );
    expect(next.status).toBe("WON");
    expect(next.winnerPlayerId).toBe("black");
  });
});

describe("GameRulesEngineTests", () => {
  it("rejectsMoveWhenNotYourTurn", () => {
    const state = emptyState();
    put(state, "LEADER", "WHITE", at(0, -3), "white-leader");
    expect(() =>
      apply(
        state,
        command({ type: "DEFAULT_MOVE", pieceId: "white-leader", targetCellId: at(1, -3) }),
        "white",
      ),
    ).toThrow(IllegalGameMoveException);
  });
});

describe("leader safety", () => {
  it("leaderAlreadyInCaptureStillAllowsUnrelatedWandererTeleports", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 0), "black-leader");
    put(state, "BRUISER", "WHITE", at(1, 0));
    put(state, "RIDER", "WHITE", at(0, -1));
    put(state, "LEADER", "WHITE", at(0, -3));
    const wanderer = put(state, "WANDERER", "BLACK", at(1, 2), "wanderer");
    const actions = legalActionsFor(state).filter((action) => action.pieceId === wanderer.id);
    expect(actions.length).toBeGreaterThan(0);
    const landing = actions.find((action) => action.targetCellId === at(3, -1));
    expect(landing).toBeTruthy();
  });

  it("leaderSafetyBlocksTeleportThatNewlyExposesLeaderToCapture", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 0), "black-leader");
    put(state, "LEADER", "WHITE", at(2, -2));
    put(state, "BRUISER", "WHITE", at(1, 0));
    put(state, "ARCHER", "WHITE", at(0, -2));
    const wanderer = put(state, "WANDERER", "BLACK", at(0, -1), "wanderer");
    const blocked = legalActionsFor(state).filter((action) => action.pieceId === wanderer.id);
    expect(blocked).toHaveLength(0);
  });
});
