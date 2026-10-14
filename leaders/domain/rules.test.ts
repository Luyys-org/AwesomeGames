import { describe, expect, it } from "vitest";

import { neighborIds } from "@/leaders/domain/board";
import { decodeActionKey, encodeActionKey } from "@/leaders/domain/action-key";
import { IllegalGameMoveException } from "@/leaders/domain/errors";
import { at, command, emptyState, put } from "@/leaders/domain/fixtures";
import { legalActionsFor, presentLegalAction } from "@/leaders/domain/legal-actions";
import { apply } from "@/leaders/domain/rules";
import { createInitial, DECK_TYPES } from "@/leaders/domain/state";
import { commitCommand, toGameStateView, tryCommit } from "@/leaders/domain/submit";
import type { Rng } from "@/leaders/domain/rng";

function scriptedRng(flags: { boolean?: boolean; floats?: number[] }): Rng {
  const floats = [...(flags.floats ?? [])];
  return {
    nextId: (() => {
      let n = 0;
      return () => `id-${n++}`;
    })(),
    nextBoolean: () => flags.boolean ?? false,
    nextFloat: () => floats.shift() ?? 0,
  };
}

describe("opening state", () => {
  it("createInitialDealsLeadersCrownsAndThreeOffers", () => {
    const state = createInitial({
      gameId: "g",
      roomId: "r",
      blackPlayerId: "host",
      whitePlayerId: "guest",
      rng: scriptedRng({ boolean: true, floats: Array.from({ length: 40 }, () => 0) }),
    });
    expect(state.version).toBe(0);
    expect(state.status).toBe("IN_PROGRESS");
    expect(state.turnNumber).toBe(1);
    expect(state.phase).toBe("ACTION");
    expect(state.recruitmentPhasesRemaining).toBe(1);
    expect(state.activeColor).toBe("BLACK");
    expect(state.firstPlayerColor).toBe("BLACK");
    expect(state.blackHand).toEqual(["LEADER"]);
    expect(state.whiteHand).toEqual(["LEADER"]);
    expect(state.deck).toHaveLength(18);
    expect(state.faceUpOffers).toHaveLength(3);
    expect([...state.deck, ...state.faceUpOffers].sort()).toEqual([...DECK_TYPES].sort());
    expect(state.cellToPiece["36"]).toBeTruthy();
    expect(state.cellToPiece["0"]).toBeTruthy();
    expect(state.pieces[state.cellToPiece["36"]].owner).toBe("BLACK");
    expect(state.pieces[state.cellToPiece["0"]].owner).toBe("WHITE");
  });
});

describe("NemesisResolutionTest", () => {
  it("enemyLeaderMoveTriggersNemesisResolutionForOpponent", () => {
    const state = emptyState();
    const leader = put(state, "LEADER", "BLACK", at(0, 0), "black-leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    const nemesis = put(state, "NEMESIS", "WHITE", at(0, 2), "nemesis");
    const next = apply(
      state,
      command({ type: "DEFAULT_MOVE", pieceId: leader.id, targetCellId: at(1, 0) }),
      "black",
    );
    expect(next.resolvingNemesis).toBe(true);
    expect(next.activeColor).toBe("BLACK");
    expect(next.pendingAbility).toBeNull();
    const actions = legalActionsFor(next);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.pieceId === nemesis.id && action.label === "NEMESIS")).toBe(
      true,
    );
    expect(() =>
      apply(next, command({ type: "END_ACTION_PHASE", expectedVersion: 0 }), "black"),
    ).toThrow(/Only Nemesis owner|Nemesis resolution/);
  });

  it("activePlayerCannotMoveWhileNemesisResolutionPending", () => {
    const state = emptyState({ resolvingNemesis: true });
    put(state, "LEADER", "BLACK", at(0, 0), "black-leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    put(state, "NEMESIS", "WHITE", at(0, 2), "nemesis");
    const rider = put(state, "RIDER", "BLACK", at(2, 0), "rider");
    expect(() =>
      apply(
        state,
        command({ type: "DEFAULT_MOVE", pieceId: rider.id, targetCellId: at(3, 0) }),
        "black",
      ),
    ).toThrow(/Only Nemesis owner may move during Nemesis resolution/);
  });
});

describe("second player and frogs", () => {
  it("secondPlayerFirstTurnGetsTwoRecruitmentPhases", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "SNIPER", "ARCHER", "VIZIER", "JAILOR"];
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "LEADER", "WHITE", at(0, -3));
    const next = apply(state, command({ type: "END_ACTION_PHASE" }), "black");
    expect(next.turnNumber).toBe(2);
    expect(next.activeColor).toBe("WHITE");
    expect(next.recruitmentPhasesRemaining).toBe(2);
    expect(next.phase).toBe("ACTION");
  });

  it("frogClearsAfterOpponentFullTurn", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "SHAMAN", "SNIPER", "ARCHER", "VIZIER"];
    state.whiteHand = ["LEADER", "SNIPER", "ARCHER", "VIZIER", "JAILOR"];
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "LEADER", "WHITE", at(0, -3));
    const shaman = put(state, "SHAMAN", "BLACK", at(0, 1), "shaman");
    const rider = put(state, "RIDER", "WHITE", at(0, 2), "rider");
    const frogged = apply(
      state,
      command({
        type: "ACTIVE_ABILITY",
        pieceId: shaman.id,
        abilityParams: { targetPieceId: rider.id },
      }),
      "black",
    );
    expect(frogged.pieces[rider.id].frog).toBe(true);
    const whiteTurn = apply(
      { ...frogged, blackHand: ["LEADER", "SHAMAN", "SNIPER", "ARCHER", "VIZIER"] },
      command({ type: "END_ACTION_PHASE" }),
      "black",
    );
    expect(whiteTurn.turnNumber).toBe(2);
    expect(whiteTurn.activeColor).toBe("WHITE");
    expect(whiteTurn.pieces[rider.id].frog).toBe(true);
    const afterOpponent = apply(
      {
        ...whiteTurn,
        whiteHand: ["LEADER", "SNIPER", "ARCHER", "VIZIER", "JAILOR"],
        // One recruitment phase already consumed (second player's first turn has two).
        recruitmentPhasesRemaining: 1,
      },
      command({ type: "END_ACTION_PHASE" }),
      "white",
    );
    expect(afterOpponent.turnNumber).toBe(3);
    expect(afterOpponent.activeColor).toBe("BLACK");
    expect(afterOpponent.pieces[rider.id].frog).toBe(false);
  });
});

describe("GameActionKeyTest", () => {
  it("roundTripsDefaultMove", () => {
    const encoded = encodeActionKey({
      type: "DEFAULT_MOVE",
      pieceId: "piece-1",
      targetCellId: 12,
      abilityParams: {},
    });
    expect(decodeActionKey(encoded)).toMatchObject({
      type: "DEFAULT_MOVE",
      pieceId: "piece-1",
      targetCellId: 12,
    });
  });

  it("roundTripsActiveAbility", () => {
    const encoded = encodeActionKey({
      type: "ACTIVE_ABILITY",
      pieceId: "claw",
      abilityParams: { mode: "drag", targetPieceId: "enemy", targetCellId: 4 },
    });
    expect(decodeActionKey(encoded).abilityParams).toEqual({
      mode: "drag",
      targetPieceId: "enemy",
      targetCellId: 4,
    });
  });

  it("legalActionExposesTargetCellFromAbilityParams", () => {
    const state = emptyState();
    const rider = put(state, "RIDER", "BLACK", at(0, 0), "rider");
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "LEADER", "WHITE", at(0, -3));
    const action = legalActionsFor(state).find(
      (entry) => entry.pieceId === rider.id && entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetCellId).toEqual(expect.any(Number));
  });

  it("legalActionUsesFirstStepCellForLegacyRoyalGuardPayload", () => {
    const state = emptyState();
    const guard = put(state, "ROYAL_GUARD", "BLACK", at(2, 0), "guard");
    const action = presentLegalAction(guard, {
      type: "ACTIVE_ABILITY",
      pieceId: guard.id,
      targetCellId: 5,
      abilityParams: { secondCellId: 9 },
    });
    expect(action.targetCellId).toBe(5);
  });

  it("rejectsInvalidPrefix", () => {
    expect(() => decodeActionKey(btoa("v2|DEFAULT_MOVE"))).toThrow(IllegalGameMoveException);
  });
});

describe("GameStateViewJsonSerializationTest", () => {
  it("acrobatLegalActionsSerializeTargetPieceIdOnlyOnFirstStep", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "LEADER", "WHITE", at(0, -3));
    const acrobat = put(state, "ACROBAT", "BLACK", at(0, 0), "acrobat");
    put(state, "RIDER", "WHITE", at(1, 0), "over");
    const action = legalActionsFor(state).find(
      (entry) => entry.pieceId === acrobat.id && entry.type === "ACTIVE_ABILITY",
    );
    const json = JSON.parse(JSON.stringify(action)) as { targetCellId: number | null; targetPieceId: string };
    expect(json.targetPieceId).toBe("over");
    expect(json.targetCellId).toBeNull();
  });

  it("wandererAndManipulatorExposeCamelCaseIds", () => {
    const state = createInitial({
      gameId: "g",
      roomId: "r",
      blackPlayerId: "host",
      whitePlayerId: "guest",
      rng: scriptedRng({ boolean: false }),
    });
    const view = toGameStateView(state);
    const json = JSON.parse(JSON.stringify(view)) as Record<string, unknown>;
    expect(json.activeColor).toBe("WHITE");
    expect(json.blackPlayerId).toBe("host");
    expect(json).not.toHaveProperty("activeAbilityBlockedThisPhase");
  });
});

describe("command feedback", () => {
  it("sendsIllegalMoveRejectionToSender", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    const result = tryCommit(
      state,
      command({ type: "DEFAULT_MOVE", pieceId: "black-leader", targetCellId: at(0, 0) }),
      "black",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.code).toBe("ILLEGAL_MOVE");
      expect(state.version).toBe(0);
    }
  });

  it("sendsStaleVersionWithActualVersion", () => {
    const state = emptyState({ version: 4 });
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    const result = tryCommit(
      state,
      command({
        type: "DEFAULT_MOVE",
        pieceId: "black-leader",
        targetCellId: at(1, 2),
        expectedVersion: 1,
      }),
      "black",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection).toEqual({
        code: "STALE_VERSION",
        message: "Stale game version",
        actualVersion: 4,
      });
    }
  });

  it("acceptedCommandBumpsVersion", () => {
    const state = emptyState();
    put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    const next = commitCommand(
      state,
      command({ type: "DEFAULT_MOVE", pieceId: "black-leader", targetCellId: at(1, 2) }),
      "black",
    );
    expect(next.version).toBe(1);
    expect(state.version).toBe(0);
  });
});

describe("recruitment hand", () => {
  it("hermitRequiresAtMostTwoNonLeaders", () => {
    const state = emptyState({ phase: "RECRUITMENT" });
    put(state, "LEADER", "BLACK", at(0, 3));
    put(state, "LEADER", "WHITE", at(0, -3));
    state.blackHand = ["LEADER", "SNIPER", "ARCHER", "VIZIER"];
    state.faceUpOffers = ["HERMIT"];
    expect(() =>
      apply(state, command({ type: "RECRUIT", offerIndex: 0, targetCellId: 35 }), "black"),
    ).toThrow(/Hermit recruitment not allowed/);
  });
});

describe("vizier geometry reminder", () => {
  it("onBoardVizierCannotMoveAfterLeaderUsesVizierStep", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "SNIPER", "ARCHER", "VIZIER", "JAILOR"];
    const leader = put(state, "LEADER", "BLACK", at(0, 0), "leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    const vizier = put(state, "VIZIER", "BLACK", at(1, 1), "vizier");
    const firstStep = apply(
      state,
      command({ type: "DEFAULT_MOVE", pieceId: leader.id, targetCellId: at(1, 0) }),
      "black",
    );
    expect(firstStep.pendingAbility?.abilityId).toBe("LEADER_VIZIER");
    const finished = apply(
      firstStep,
      command({ type: "DEFAULT_MOVE", pieceId: leader.id, targetCellId: at(2, 0) }),
      "black",
    );
    expect(finished.actedThisPhase).toContain(vizier.id);
    expect(
      legalActionsFor(finished).some(
        (action) => action.pieceId === vizier.id && action.type === "DEFAULT_MOVE",
      ),
    ).toBe(false);
  });

  it("leaderWithVizierMayHaveExtendedDefaultMove", () => {
    const state = emptyState();
    state.blackHand = ["LEADER", "VIZIER"];
    const leader = put(state, "LEADER", "BLACK", at(0, 0), "leader");
    put(state, "LEADER", "WHITE", at(0, -3));
    const cells = new Set(
      legalActionsFor(state)
        .filter((action) => action.pieceId === leader.id)
        .map((action) => action.targetCellId),
    );
    expect(cells.has(at(1, 0))).toBe(true);
    expect(cells.has(at(2, 0))).toBe(true);
    expect(cells.has(at(0, 0))).toBe(false);
    expect(neighborIds(at(0, 0)).every((cellId) => cells.has(cellId))).toBe(true);
  });
});
