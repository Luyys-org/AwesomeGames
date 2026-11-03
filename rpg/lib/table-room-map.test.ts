import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import { coreCharacterOptions } from "@/rpg/lib/character-options";
import type { StoredRoomMap } from "@/rpg/lib/room-map";
import { createTable, retainLiveRoomMap } from "@/rpg/lib/table";

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

const drawn: StoredRoomMap = {
  placeId: "pier",
  imageId: "map_abcdef01",
  doors: [{ placeId: "lane", wall: "east" }],
};

const live = {
  ...createTable("ABCDEF", settings),
  revision: 11,
  situation: "The party is still on the pier.",
  roomMaps: [drawn],
  roomMapBusy: false,
};

const newerBranch = {
  ...live,
  revision: 12,
  situation: "The lock gives way.",
  roomMaps: [],
  roomMapBusy: true,
};

const kept = retainLiveRoomMap(live, newerBranch);
assert.equal(kept.revision, 12);
assert.equal(kept.situation, "The lock gives way.");
assert.equal(kept.roomMapBusy, false);
assert.deepEqual(kept.roomMaps, [drawn]);

const sameRevision = retainLiveRoomMap(live, { ...newerBranch, revision: 11 });
assert.equal(sameRevision.revision, 12);
assert.equal(sameRevision.roomMapBusy, false);
assert.deepEqual(sameRevision.roomMaps, [drawn]);

const olderBranch = retainLiveRoomMap(live, { ...newerBranch, revision: 10 });
assert.equal(olderBranch.revision, 12);
assert.deepEqual(olderBranch.roomMaps, [drawn]);
