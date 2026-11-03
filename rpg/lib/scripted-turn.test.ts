import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import { coreCharacterOptions } from "@/rpg/lib/character-options";
import type { TableCharacter } from "@/rpg/lib/character";
import { parseGeneratedPlan } from "@/rpg/lib/campaign-plan";
import { emptyJourney } from "@/rpg/lib/journey";
import { resolveScriptedAction } from "@/rpg/lib/scripted-turn";
import type { TableState } from "@/rpg/lib/table";

const settings = {
  campaignName: "Ashreach",
  universe: "custom",
  universeLabel: "Ashreach",
  universeType: "fantasy",
  playerCount: 2,
  characterOptions: coreCharacterOptions(),
  objective: "Recover the beacon before the storm hits.",
  deathPenalty: "wounded",
  enemyDifficulty: "standard",
  lootRarity: "common",
  playerFreedom: "guided",
} as CampaignSettings;

function action(
  id: string,
  effect: "stay" | "next-place" | "clear-scene" | "encounter",
  encounterId = "",
) {
  return {
    id,
    label: id.replaceAll("-", " "),
    stat: "might",
    difficulty: 10 as const,
    failure: "harm" as const,
    abilityId: "",
    effect,
    encounterId,
    certain: effect === "stay",
    setup: `Try ${id}.`,
    success: `${id} works.`,
    miss: `${id} fails.`,
  };
}

function place(id: string, name: string, next: string) {
  const actions = [action(`look-${id}`, "stay")];
  if (next) actions.push(action(`go-${id}`, "next-place"));
  else actions.push(action(`finish-${id}`, "clear-scene"));
  return {
    id,
    name,
    summary: `${name} holds the next step.`,
    next,
    narration: `${name} is the room the party must deal with.`,
    actions,
    encounters: [] as {
      id: string;
      name: string;
      summary: string;
      triggerActionId: string;
      defeat: { xp: number; currency: number; items: [] };
      malus: { wounds: 0 | 1 | 2; consequence: string };
    }[],
  };
}

function scene(
  id: string,
  name: string,
  objective: string,
  next: string,
  places: ReturnType<typeof place>[],
) {
  const last = places[places.length - 1];
  if (last && last.next === "" && next !== "") last.actions.push(action(`leave-${last.id}`, "next-place"));
  return {
    id,
    name,
    summary: `${name} is the next step.`,
    objective,
    next,
    narration: `${name} pursues the next step.`,
    success: `${name} is finished.`,
    failure: `${name} holds.`,
    places,
  };
}

function body() {
  return {
    scenes: [
      scene("docks", "The Docks", "Find who took the beacon off the ship.", "market", [
        place("pier", "Outer pier", "lane"),
        place("lane", "Cargo lane", "warehouse"),
        place("warehouse", "Bonded warehouse", ""),
      ]),
      scene("market", "The Market", "Learn which buyer holds the beacon.", "vault", [
        place("stalls", "Night stalls", "office"),
        place("office", "Broker office", ""),
      ]),
      scene("vault", "The Vault", "Take the beacon from the buyer.", "", [
        place("stair", "Vault stair", "chamber"),
        place("chamber", "Beacon chamber", ""),
      ]),
    ],
  };
}

function character(): TableCharacter {
  return {
    id: "pc_aaa",
    name: "Ada",
    abilityId: "fighter",
    extraAbilityId: "",
    classId: "",
    raceId: "",
    raceStatIds: [],
    stats: { might: 2, finesse: 1, wits: 1 },
    wounds: [],
    situation: "standing",
    claimCode: "ABCD",
    owner: "host",
    archived: false,
    inScene: true,
    ready: true,
    currency: 0,
    inventory: [],
    level: 1,
    xp: 0,
    pendingRewards: 0,
  };
}

function tableFor(planBody: ReturnType<typeof body>, placeId = "pier"): TableState {
  const parsed = parseGeneratedPlan(planBody, settings);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error(parsed.error);
  const scene = parsed.value.scenes[0];
  if (scene) {
    scene.rewards = [
      {
        characterId: "pc_aaa",
        xp: 40,
        currency: 5,
        items: [{ name: "Rope", slot: "", equipped: false, modifiers: [{ kind: "stat", statId: "might", amount: 1 }] }],
      },
    ];
  }
  return {
    roomCode: "ABCDEF",
    roomStatus: "open",
    phase: "play",
    settings,
    objectiveStatus: "active",
    scene: 1,
    situation: "The pier.",
    location: { place: "Outer pier", weather: "", reputation: "" },
    revision: 1,
    characters: [character()],
    transcript: [],
    availableActions: [],
    loadoutReady: true,
    gmBusy: false,
    journey: emptyJourney(),
    campaignPlan: { ...parsed.value, currentPlaceId: placeId },
  };
}

const moved = resolveScriptedAction(tableFor(body()), "go-pier", "pc_aaa", true);
assert.equal(moved.ok, true);
if (moved.ok) {
  assert.equal(moved.table.campaignPlan?.currentPlaceId, "lane");
  assert.equal(moved.table.location.place, "Cargo lane");
  assert.equal(moved.table.objectiveStatus, "active");
  assert.ok(moved.facts.includes("go-pier works."));
}

const blocked = resolveScriptedAction(tableFor(body(), "warehouse"), "leave-warehouse", "pc_aaa", true);
assert.equal(blocked.ok, false);

const cleared = resolveScriptedAction(tableFor(body(), "warehouse"), "finish-warehouse", "pc_aaa", true);
assert.equal(cleared.ok, true);
if (cleared.ok) {
  assert.equal(cleared.table.campaignPlan?.currentPlaceId, "warehouse");
  assert.equal(
    cleared.table.campaignPlan?.scenes.find((entry) => entry.id === "docks")?.objectiveStatus,
    "cleared",
  );
  assert.equal(cleared.table.characters[0]?.xp, 80);
  assert.equal(cleared.table.characters[0]?.currency, 5);
  assert.equal(cleared.table.characters[0]?.inventory[0]?.name, "Rope");
  assert.ok(cleared.table.availableActions.some((action) => action.id === "leave-warehouse"));
  assert.equal(
    cleared.table.availableActions.some((action) => action.id === "finish-warehouse"),
    false,
  );
}

const withEncounter = body();
const pier = withEncounter.scenes[0]?.places[0];
if (!pier) throw new Error("missing pier");
pier.actions.push(action("fight-pier", "encounter", "rats"));
pier.encounters.push({
  id: "rats",
  name: "Wharf rats",
  summary: "A pack of rats.",
  triggerActionId: "fight-pier",
  defeat: { xp: 20, currency: 3, items: [] },
  malus: { wounds: 1, consequence: "The rats bite." },
});

const bitten = resolveScriptedAction(tableFor(withEncounter), "fight-pier", "pc_aaa", false);
assert.equal(bitten.ok, true);
if (bitten.ok) {
  assert.deepEqual(bitten.table.characters[0]?.wounds, ["hurt"]);
  assert.equal(bitten.table.characters[0]?.currency, 0);
  assert.equal(bitten.table.campaignPlan?.scenes[0]?.places[0]?.encounters[0]?.resolved, false);
  assert.ok(bitten.facts.includes("The rats bite."));
}

const victorious = resolveScriptedAction(tableFor(withEncounter), "fight-pier", "pc_aaa", true);
assert.equal(victorious.ok, true);
if (victorious.ok) {
  assert.equal(victorious.table.characters[0]?.currency, 3);
  assert.equal(victorious.table.characters[0]?.xp, 40);
  assert.equal(victorious.table.campaignPlan?.scenes[0]?.places[0]?.encounters[0]?.resolved, true);
  assert.equal(
    victorious.table.availableActions.some((action) => action.id === "fight-pier"),
    false,
  );
  assert.equal(victorious.table.characters[0]?.wounds.length, 0);
}

console.log("scripted turn checks passed");
