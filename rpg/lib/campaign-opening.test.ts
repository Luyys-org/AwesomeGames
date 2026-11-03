import assert from "node:assert/strict";

import type { CampaignPlan } from "@/rpg/lib/campaign-plan";
import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { CharacterDraft } from "@/rpg/lib/character";
import { coreCharacterOptions } from "@/rpg/lib/character-options";
import {
  applyCampaignOpening,
  commitCharacter,
  createTable,
  openLobby,
  setCharacterReady,
  startCampaign,
  type CampaignOpening,
} from "@/rpg/lib/table";

const settings = {
  campaignName: "Ashreach",
  universe: "custom",
  universeLabel: "Custom",
  universeType: "fantasy",
  playerCount: 4,
  characterOptions: coreCharacterOptions(),
  objective: "Recover the beacon before the storm hits.",
  deathPenalty: "wounded",
  enemyDifficulty: "standard",
  lootRarity: "uncommon",
  playerFreedom: "open",
} satisfies CampaignSettings;

const draft = {
  name: "Ada",
  abilityId: "fighter",
  extraAbilityId: "",
  classId: "",
  raceId: "",
  raceStatIds: [],
  stats: { might: "4", finesse: "3", wits: "3" },
} satisfies CharacterDraft;

const plan = {
  scripted: true,
  currentSceneId: "dock",
  currentPlaceId: "pier",
  scenes: [
    {
      id: "dock",
      name: "Dock",
      summary: "The docks.",
      objective: "Find the beacon.",
      next: "",
      places: [
        {
          id: "pier",
          name: "Pier",
          summary: "A wet pier.",
          next: "",
          narration: "The pier is empty.",
          actions: [],
          encounters: [],
        },
      ],
      objectiveStatus: "pending",
      narration: "Night on the docks.",
      success: "Done.",
      failure: "Lost.",
      rewards: [],
    },
  ],
} satisfies CampaignPlan;

const opening = {
  plan,
  situation: "The pier is quiet.",
  location: { place: "Pier", weather: "", reputation: "" },
} satisfies CampaignOpening;

const lobby = openLobby({ ...createTable("ABCDEF", settings), revision: 1 });
const created = commitCharacter(lobby, draft, "host");
assert.equal(created.ok, true);
if (!created.ok) throw new Error("create failed");
const ready = setCharacterReady(created.table, created.character.id, true);
assert.equal(ready.ok, true);
if (!ready.ok) throw new Error("ready failed");

const blocked = startCampaign(ready.table);
assert.equal(blocked.ok, false);
if (blocked.ok) throw new Error("start should wait for the opening");
assert.equal(blocked.error, "The campaign is still being prepared.");

const applied = applyCampaignOpening(ready.table, opening);
assert.ok(applied);
if (!applied) throw new Error("opening was not applied");
assert.equal(applied.characters.length, 1);
assert.equal(applied.characters[0]?.name, "Ada");
assert.equal(applied.revision, ready.table.revision + 1);
assert.equal(applied.situation, "The pier is quiet.");
assert.equal(applied.journey.places[0]?.name, "Pier");
assert.equal(applyCampaignOpening(applied, opening), null);

const started = startCampaign(applied);
assert.equal(started.ok, true);
if (!started.ok) throw new Error("start failed");
assert.equal(started.table.phase, "play");
assert.equal(started.table.transcript[0]?.type, "situation");
assert.equal(started.table.transcript[0]?.text, "The pier is quiet.");

console.log("campaign opening checks passed");
