import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import {
  planBounds,
  planForPrompt,
  parseGeneratedPlan,
  parseStoredPlan,
  resolvePlanBeat,
  type CampaignPlan,
} from "@/rpg/lib/campaign-plan";
import { campaignPlanSchema } from "@/rpg/lib/host-response-schema";

const settings = {
  enemyDifficulty: "standard",
  objective: "Recover the beacon before the storm hits.",
} as CampaignSettings;

function place(id: string, name: string, next: string) {
  return { id, name, summary: `${name} holds the next step of the quest.`, next };
}

function scene(
  id: string,
  name: string,
  objective: string,
  next: string,
  places: ReturnType<typeof place>[],
) {
  return {
    id,
    name,
    summary: `${name} is the next step toward the beacon.`,
    objective,
    next,
    places,
  };
}

function validBody() {
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

function plan(): CampaignPlan {
  const parsed = parseGeneratedPlan(validBody(), settings);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

const generated = parseGeneratedPlan(validBody(), settings);
assert.equal(generated.ok, true);
if (generated.ok) {
  assert.equal(generated.value.currentSceneId, "docks");
  assert.equal(generated.value.currentPlaceId, "pier");
  assert.equal(generated.value.scenes.every((entry) => entry.objectiveStatus === "pending"), true);
  assert.deepEqual(
    generated.value.scenes.map((entry) => entry.id),
    ["docks", "market", "vault"],
  );
  assert.deepEqual(
    generated.value.scenes[0]?.places.map((entry) => entry.id),
    ["pier", "lane", "warehouse"],
  );
}

const copied = parseGeneratedPlan(
  {
    scenes: [
      scene("docks", "The Docks", "Recover the beacon before the storm hits.", "market", [
        place("pier", "Outer pier", "warehouse"),
        place("warehouse", "Bonded warehouse", ""),
      ]),
      ...validBody().scenes.slice(1),
    ],
  },
  settings,
);
assert.equal(copied.ok, false);

const branched = parseGeneratedPlan(
  {
    scenes: [
      scene("docks", "The Docks", "Find who took the beacon off the ship.", "market", [
        place("pier", "Outer pier", "warehouse"),
        place("lane", "Cargo lane", "warehouse"),
        place("warehouse", "Bonded warehouse", ""),
      ]),
      ...validBody().scenes.slice(1),
    ],
  },
  settings,
);
assert.equal(branched.ok, false);

const cycled = parseGeneratedPlan(
  {
    scenes: [
      scene("docks", "The Docks", "Find who took the beacon off the ship.", "market", [
        place("pier", "Outer pier", "lane"),
        place("lane", "Cargo lane", "pier"),
      ]),
      ...validBody().scenes.slice(1),
    ],
  },
  settings,
);
assert.equal(cycled.ok, false);

const direct = plan();
const skipped = resolvePlanBeat(
  { placeId: "warehouse", sceneId: "", clearedSceneId: "" },
  direct,
  "",
  true,
);
assert.equal(skipped.ok, false);

const renamed = resolvePlanBeat(
  { placeId: "", sceneId: "", clearedSceneId: "" },
  direct,
  "A new town",
  true,
);
assert.equal(renamed.ok, false);

const stepped = resolvePlanBeat(
  { placeId: "lane", sceneId: "", clearedSceneId: "" },
  direct,
  "",
  true,
);
assert.equal(stepped.ok, true);
if (stepped.ok) {
  assert.equal(stepped.value.place, "Cargo lane");
  assert.equal(stepped.value.planUpdate?.currentPlaceId, "lane");
  assert.equal(stepped.value.planUpdate?.currentSceneId, "docks");
}

const earlyClear = resolvePlanBeat(
  { placeId: "", sceneId: "", clearedSceneId: "docks" },
  direct,
  "",
  true,
);
assert.equal(earlyClear.ok, false);

const earlyScene = resolvePlanBeat(
  { placeId: "", sceneId: "market", clearedSceneId: "" },
  direct,
  "",
  true,
);
assert.equal(earlyScene.ok, false);

const atWarehouse = parseStoredPlan({
  ...validBody(),
  currentSceneId: "docks",
  currentPlaceId: "warehouse",
});
assert.equal(atWarehouse.ok, true);
if (atWarehouse.ok) {
  const cleared = resolvePlanBeat(
    { placeId: "", sceneId: "market", clearedSceneId: "docks" },
    atWarehouse.value,
    "",
    true,
  );
  assert.equal(cleared.ok, true);
  if (cleared.ok) {
    assert.equal(cleared.value.place, "Night stalls");
    assert.equal(cleared.value.planUpdate?.currentSceneId, "market");
    assert.equal(cleared.value.planUpdate?.currentPlaceId, "stalls");
    assert.equal(
      cleared.value.planUpdate?.scenes.find((entry) => entry.id === "docks")?.objectiveStatus,
      "cleared",
    );
  }

  const held = resolvePlanBeat(
    { placeId: "", sceneId: "market", clearedSceneId: "" },
    atWarehouse.value,
    "",
    true,
  );
  assert.equal(held.ok, false);
}

const duringCheck = resolvePlanBeat(
  { placeId: "lane", sceneId: "", clearedSceneId: "" },
  direct,
  "",
  false,
);
assert.equal(duringCheck.ok, false);

const missing = resolvePlanBeat({ narration: "The door holds." }, direct, "", true);
assert.equal(missing.ok, false);

const stored = parseStoredPlan({
  ...validBody(),
  currentSceneId: "market",
  currentPlaceId: "office",
  scenes: validBody().scenes.map((entry) =>
    entry.id === "docks" ? { ...entry, objectiveStatus: "cleared" } : entry,
  ),
});
assert.equal(stored.ok, true);
if (stored.ok) {
  assert.equal(stored.value.currentSceneId, "market");
  assert.equal(stored.value.scenes.find((entry) => entry.id === "docks")?.objectiveStatus, "cleared");
  assert.equal(stored.value.scenes.find((entry) => entry.id === "market")?.objectiveStatus, "pending");
  const prompt = planForPrompt(stored.value);
  assert.equal(prompt?.mayAdvanceScene, false);
  assert.equal(prompt?.mayFinishObjective, false);
}

const shuffled = parseGeneratedPlan(
  { scenes: [validBody().scenes[2], validBody().scenes[0], validBody().scenes[1]] },
  settings,
);
assert.equal(shuffled.ok, true);
if (shuffled.ok) {
  assert.deepEqual(
    shuffled.value.scenes.map((entry) => entry.id),
    ["docks", "market", "vault"],
  );
  assert.equal(shuffled.value.currentSceneId, "docks");
  assert.equal(shuffled.value.currentPlaceId, "pier");
}

const schema = campaignPlanSchema(planBounds("standard"));
const scenes = schema.schema.properties?.scenes as { minItems?: number; maxItems?: number };
assert.equal(scenes.minItems, 3);
assert.equal(scenes.maxItems, 3);

console.log("campaign plan checks passed");
