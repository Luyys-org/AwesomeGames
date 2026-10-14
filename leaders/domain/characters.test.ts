import { describe, expect, it } from "vitest";

import { axialDistance, neighborIds } from "@/leaders/domain/board";
import { at, command, emptyState, put } from "@/leaders/domain/fixtures";
import { legalActionsFor } from "@/leaders/domain/legal-actions";
import { apply } from "@/leaders/domain/rules";
import type { GameLegalAction } from "@/leaders/services/game.types";

function actionsFor(pieceId: string, actions: GameLegalAction[]): GameLegalAction[] {
  return actions.filter((action) => action.pieceId === pieceId);
}

function board() {
  const state = emptyState();
  put(state, "LEADER", "BLACK", at(0, 3), "black-leader");
  put(state, "LEADER", "WHITE", at(0, -3), "white-leader");
  return state;
}

describe("LegalActionsResolverTest", () => {
  it("includesDefaultMovesForActiveLeaderAtTurnStart", () => {
    const state = board();
    const leaderMoves = actionsFor("black-leader", legalActionsFor(state));
    expect(leaderMoves.length).toBeGreaterThan(0);
    expect(leaderMoves.every((action) => action.type === "DEFAULT_MOVE" && action.targetCellId != null)).toBe(
      true,
    );
  });
});

describe("CharacterLegalActionsTest", () => {
  it("leaderHasDefaultMoveWithTargetCell", () => {
    const state = board();
    const action = actionsFor("black-leader", legalActionsFor(state))[0];
    expect(action.targetCellId).toEqual(expect.any(Number));
    expect(action.label).toBe("LEADER");
  });

  it("shamanHasVisibleLineActiveAbility", () => {
    const state = board();
    const shaman = put(state, "SHAMAN", "BLACK", at(0, 0), "shaman");
    put(state, "RIDER", "WHITE", at(0, -1), "rider");
    const action = actionsFor(shaman.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetPieceId).toBe("rider");
  });

  it("sniperHasDefaultMoveOnly", () => {
    const state = board();
    const sniper = put(state, "SNIPER", "BLACK", at(1, 0), "sniper");
    const actions = actionsFor(sniper.id, legalActionsFor(state));
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.type === "DEFAULT_MOVE")).toBe(true);
  });

  it("tacticianHasActiveAbilityWithTargets", () => {
    const state = board();
    const tactician = put(state, "TACTICIAN", "BLACK", at(0, 1), "tactician");
    put(state, "RIDER", "BLACK", at(0, -2), "pin");
    const mover = put(state, "BRUISER", "BLACK", at(2, 0), "mover");
    const action = actionsFor(tactician.id, legalActionsFor(state)).find(
      (entry) => entry.targetPieceId === mover.id,
    );
    expect(action?.targetCellId).toEqual(expect.any(Number));
    expect(action?.targetPieceId).toBe(mover.id);
  });

  it("tacticianCannotTargetItself", () => {
    const state = board();
    const tactician = put(state, "TACTICIAN", "BLACK", at(0, 1), "tactician");
    put(state, "RIDER", "BLACK", at(0, -2), "pin");
    const selfTargets = actionsFor(tactician.id, legalActionsFor(state)).filter(
      (entry) => entry.targetPieceId === tactician.id,
    );
    expect(selfTargets).toHaveLength(0);
  });

  it("tacticianMayMoveDistantAllyWhenAnotherAllyPinsEnemyLeader", () => {
    const state = board();
    put(state, "TACTICIAN", "BLACK", at(2, 1), "tactician");
    put(state, "RIDER", "BLACK", at(1, -3), "pin");
    const distant = put(state, "BRUISER", "BLACK", at(-2, 0), "distant");
    const targets = new Set(
      actionsFor("tactician", legalActionsFor(state)).map((action) => action.targetPieceId),
    );
    expect(targets.has(distant.id)).toBe(true);
    expect(targets.has("pin")).toBe(true);
  });

  it("willOWispHasTeleportOnly", () => {
    const state = board();
    const wisp = put(state, "WILL_O_THE_WISP", "BLACK", at(0, 0), "wisp");
    const actions = actionsFor(wisp.id, legalActionsFor(state));
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.type === "ACTIVE_ABILITY")).toBe(true);
  });

  it("willOWispHasTeleportOnlyNotDefaultMove", () => {
    const state = board();
    const wisp = put(state, "WILL_O_THE_WISP", "BLACK", at(0, 0), "wisp");
    expect(actionsFor(wisp.id, legalActionsFor(state)).some((action) => action.type === "DEFAULT_MOVE")).toBe(
      false,
    );
  });

  it("acrobatHasJumpActiveAbility", () => {
    const state = board();
    const acrobat = put(state, "ACROBAT", "BLACK", at(0, 0), "acrobat");
    put(state, "RIDER", "WHITE", at(1, 0), "over");
    const action = actionsFor(acrobat.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetPieceId).toBe("over");
    expect(action?.targetCellId).toBeNull();
  });

  it("initialStepListsJumpTargetsByPieceIdOnly", () => {
    const state = board();
    const acrobat = put(state, "ACROBAT", "BLACK", at(0, 0), "acrobat");
    put(state, "RIDER", "WHITE", at(1, 0), "over");
    const action = actionsFor(acrobat.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetPieceId).toBe("over");
    expect(action?.targetCellId).toBeNull();
  });

  it("riderHasTwoStepActiveAbility", () => {
    const state = board();
    const rider = put(state, "RIDER", "BLACK", at(0, 0), "rider");
    const action = actionsFor(rider.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetCellId).toEqual(expect.any(Number));
    expect(axialDistance(at(0, 0), action?.targetCellId ?? -1)).toBe(2);
  });

  it("bruiserHasPushActiveAbility", () => {
    const state = board();
    const bruiser = put(state, "BRUISER", "BLACK", at(0, 0), "bruiser");
    put(state, "RIDER", "WHITE", at(1, 0), "enemy");
    const pushes = actionsFor(bruiser.id, legalActionsFor(state)).filter(
      (action) => action.type === "ACTIVE_ABILITY",
    );
    expect(pushes.length).toBeGreaterThan(0);
    expect(pushes.length).toBeLessThanOrEqual(3);
    expect(pushes.every((action) => action.targetPieceId === "enemy")).toBe(true);
  });

  it("oppositeHexesAreAtMostThreeAndExcludeBruiserSide", () => {
    const state = board();
    const bruiser = put(state, "BRUISER", "BLACK", at(1, 0), "bruiser");
    put(state, "RIDER", "WHITE", at(0, 0), "enemy");
    const cells = actionsFor(bruiser.id, legalActionsFor(state))
      .filter((action) => action.type === "ACTIVE_ABILITY")
      .map((action) => action.targetCellId)
      .filter((cellId): cellId is number => cellId != null);
    expect(cells).not.toContain(at(1, 0));
    expect(cells.length).toBeLessThanOrEqual(3);
  });

  it("royalGuardHasLeaderAdjacentActiveAbility", () => {
    const state = board();
    const guard = put(state, "ROYAL_GUARD", "BLACK", at(0, 0), "guard");
    const cells = actionsFor(guard.id, legalActionsFor(state))
      .filter((action) => action.type === "ACTIVE_ABILITY")
      .map((action) => action.targetCellId);
    for (const cellId of cells) {
      expect(neighborIds(at(0, 3))).toContain(cellId);
    }
  });

  it("illusionistHasSwapActiveAbility", () => {
    const state = board();
    const illusionist = put(state, "ILLUSIONIST", "BLACK", at(0, 0), "illusionist");
    put(state, "RIDER", "WHITE", at(0, -2), "rider");
    const action = actionsFor(illusionist.id, legalActionsFor(state)).find(
      (entry) => entry.targetPieceId === "rider",
    );
    expect(action?.targetPieceId).toBe("rider");
  });

  it("clawLauncherHasAdvanceOrDragChoiceGroup", () => {
    const state = board();
    const claw = put(state, "CLAW_LAUNCHER", "BLACK", at(0, 0), "claw");
    put(state, "RIDER", "WHITE", at(0, -2), "rider");
    const actions = actionsFor(claw.id, legalActionsFor(state)).filter(
      (action) => action.choiceGroup === "CLAW:rider",
    );
    expect(actions.length).toBeGreaterThanOrEqual(2);
  });

  it("manipulatorHasLineMoveActiveAbility", () => {
    const state = board();
    const manipulator = put(state, "MANIPULATOR", "BLACK", at(0, 0), "manipulator");
    put(state, "RIDER", "WHITE", at(0, -2), "rider");
    const action = actionsFor(manipulator.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetPieceId).toBe("rider");
    expect(action?.targetCellId).toBeNull();
  });

  it("wandererHasNonAdjacentEnemyActiveAbility", () => {
    const state = board();
    const wanderer = put(state, "WANDERER", "BLACK", at(0, 0), "wanderer");
    const action = actionsFor(wanderer.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetCellId).toEqual(expect.any(Number));
  });

  it("brewmasterHasAllyMoveActiveAbility", () => {
    const state = board();
    const brewmaster = put(state, "BREWMASTER", "BLACK", at(0, 1), "brewmaster");
    put(state, "RIDER", "BLACK", at(1, 1), "ally");
    const action = actionsFor(brewmaster.id, legalActionsFor(state)).find(
      (entry) => entry.type === "ACTIVE_ABILITY",
    );
    expect(action?.targetPieceId).toBe("ally");
    expect(action?.targetCellId).toEqual(expect.any(Number));
  });

  it("passiveCharactersHaveDefaultMoveOnly", () => {
    const state = board();
    for (const type of ["ARCHER", "ASSASSIN", "JAILOR", "PROTECTOR", "VIZIER", "HERMIT", "CUB"] as const) {
      const piece = put(state, type, "BLACK", at(0, 0), type);
      const actions = actionsFor(piece.id, legalActionsFor(state));
      expect(actions.every((action) => action.type === "DEFAULT_MOVE")).toBe(true);
      delete state.pieces[piece.id];
      delete state.cellToPiece[String(piece.cellId)];
    }
  });

  it("nemesisHasNoVoluntaryActions", () => {
    const state = board();
    const nemesis = put(state, "NEMESIS", "BLACK", at(0, 0), "nemesis");
    expect(actionsFor(nemesis.id, legalActionsFor(state))).toHaveLength(0);
  });
});

describe("LegalActionsResolverEdgeCasesTest", () => {
  it("froggedPieceHasNoActiveAbilityCandidates", () => {
    const state = board();
    const shaman = put(state, "SHAMAN", "BLACK", at(0, 0), "shaman");
    shaman.frog = true;
    put(state, "RIDER", "WHITE", at(1, 0), "rider");
    const actions = actionsFor(shaman.id, legalActionsFor(state));
    expect(actions.some((action) => action.type === "DEFAULT_MOVE")).toBe(true);
    expect(actions.some((action) => action.type === "ACTIVE_ABILITY")).toBe(false);
  });

  it("protectorBlocksEnemyManipulatorMove", () => {
    const state = board();
    const manipulator = put(state, "MANIPULATOR", "BLACK", at(0, 0), "manipulator");
    put(state, "PROTECTOR", "WHITE", at(0, -2), "protector");
    const aimed = actionsFor(manipulator.id, legalActionsFor(state)).filter(
      (action) => action.targetPieceId === "protector",
    );
    expect(aimed).toHaveLength(0);
  });

  it("pendingAcrobatOffersOnlySecondJumpOrComplete", () => {
    const state = board();
    const acrobat = put(state, "ACROBAT", "BLACK", at(0, 0), "acrobat");
    put(state, "RIDER", "WHITE", at(1, 0), "over");
    put(state, "BRUISER", "WHITE", at(-1, 0), "other");
    const first = apply(
      state,
      command({
        type: "ACTIVE_ABILITY",
        pieceId: acrobat.id,
        abilityParams: { targetPieceId: "over" },
      }),
      "black",
    );
    expect(first.pendingAbility?.abilityId).toBe("ACROBAT");
    const actions = legalActionsFor(first);
    expect(actions.every((action) => action.pieceId === acrobat.id)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
    const keys = actions.map((action) => action.actionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("WandererLegalActionsTest", () => {
  it("excludesEmptyHexesAdjacentToEnemy", () => {
    const state = board();
    const wanderer = put(state, "WANDERER", "BLACK", at(0, 0), "wanderer");
    const enemy = at(2, 0);
    put(state, "RIDER", "WHITE", enemy, "rider");
    const cells = actionsFor(wanderer.id, legalActionsFor(state))
      .filter((action) => action.type === "ACTIVE_ABILITY")
      .map((action) => action.targetCellId);
    for (const neighbor of neighborIds(enemy)) {
      expect(cells).not.toContain(neighbor);
    }
  });

  it("allowsEmptyHexAdjacentToAllyButNotEnemy", () => {
    const state = board();
    const wanderer = put(state, "WANDERER", "BLACK", at(0, 1), "wanderer");
    put(state, "RIDER", "BLACK", at(2, 0), "ally");
    const cells = actionsFor(wanderer.id, legalActionsFor(state)).map((action) => action.targetCellId);
    expect(cells).toContain(at(1, 0));
  });

  it("jailorAdjacentSuppressesActiveAbility", () => {
    const state = board();
    const wanderer = put(state, "WANDERER", "BLACK", at(0, 0), "wanderer");
    put(state, "JAILOR", "WHITE", at(1, 0), "jailor");
    const actions = actionsFor(wanderer.id, legalActionsFor(state));
    expect(actions.some((action) => action.type === "ACTIVE_ABILITY")).toBe(false);
    expect(actions.some((action) => action.type === "DEFAULT_MOVE")).toBe(true);
  });

  it("applyTeleportMovesWandererToChosenEmptyCell", () => {
    const state = board();
    const wanderer = put(state, "WANDERER", "BLACK", at(0, 0), "wanderer");
    const next = apply(
      state,
      command({
        type: "ACTIVE_ABILITY",
        pieceId: wanderer.id,
        abilityParams: { targetCellId: at(3, -1) },
      }),
      "black",
    );
    expect(next.pieces[wanderer.id].cellId).toBe(at(3, -1));
    expect(next.cellToPiece[String(at(3, -1))]).toBe(wanderer.id);
  });
});

describe("BruiserPushLegalActionsTest", () => {
  it("applyPushPlacesBruiserOnFormerEnemyCellAndEnemyOnPushDestination", () => {
    const state = board();
    const bruiser = put(state, "BRUISER", "BLACK", at(1, 0), "bruiser");
    const enemy = put(state, "RIDER", "WHITE", at(0, 0), "enemy");
    const push = actionsFor(bruiser.id, legalActionsFor(state)).find(
      (action) => action.type === "ACTIVE_ABILITY",
    );
    expect(push?.targetCellId).toEqual(expect.any(Number));
    const next = apply(
      state,
      command({
        type: "ACTIVE_ABILITY",
        pieceId: bruiser.id,
        abilityParams: { targetPieceId: enemy.id, targetCellId: push?.targetCellId ?? 0 },
      }),
      "black",
    );
    expect(next.pieces[bruiser.id].cellId).toBe(at(0, 0));
    expect(next.pieces[enemy.id].cellId).toBe(push?.targetCellId);
    expect(next.cellToPiece[String(at(0, 0))]).toBe(bruiser.id);
    expect(next.cellToPiece[String(push?.targetCellId ?? -1)]).toBe(enemy.id);
  });
});
