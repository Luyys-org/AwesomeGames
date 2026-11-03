import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import { parseGeneratedPlan, roomExits, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import { checkRoomMapDoors, type RoomMapDoor } from "@/rpg/lib/room-map";

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

function plan(): CampaignPlan {
  const parsed = parseGeneratedPlan(
    {
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
    },
    settings,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function at(source: CampaignPlan, sceneId: string, placeId: string): CampaignPlan {
  return { ...source, currentSceneId: sceneId, currentPlaceId: placeId };
}

const base = plan();

const middle = roomExits(at(base, "docks", "lane")).map((exit) => exit.placeId);
assert.deepEqual(middle, ["pier", "warehouse"]);

const first = roomExits(at(base, "docks", "pier")).map((exit) => exit.placeId);
assert.deepEqual(first, ["lane"]);

const lastWithNextScene = roomExits(at(base, "docks", "warehouse")).map((exit) => exit.placeId);
assert.deepEqual(lastWithNextScene, ["lane", "stalls"]);

const laterFirst = roomExits(at(base, "market", "stalls")).map((exit) => exit.placeId);
assert.deepEqual(laterFirst, ["warehouse", "office"]);

const single: CampaignPlan = {
  currentSceneId: "only",
  currentPlaceId: "cell",
  scenes: [
    {
      id: "only",
      name: "Only",
      summary: "One room.",
      objective: "Wait.",
      next: "",
      objectiveStatus: "pending",
      places: [{ id: "cell", name: "The cell", summary: "A bare cell.", next: "" }],
    },
  ],
};
assert.deepEqual(roomExits(single), []);

const exits = [
  { placeId: "pier", name: "Outer pier", summary: "Back." },
  { placeId: "warehouse", name: "Bonded warehouse", summary: "Forward." },
];

const covered: RoomMapDoor[] = [
  { placeId: "pier", wall: "west" },
  { placeId: "warehouse", wall: "east" },
];
assert.deepEqual(checkRoomMapDoors(covered, exits), { ok: true });

const missing = checkRoomMapDoors([{ placeId: "pier", wall: "west" }], exits);
assert.equal(missing.ok, false);
if (!missing.ok) assert.match(missing.error, /warehouse/);

const duplicateWall = checkRoomMapDoors(
  [
    { placeId: "pier", wall: "north" },
    { placeId: "warehouse", wall: "north" },
  ],
  exits,
);
assert.equal(duplicateWall.ok, false);
if (!duplicateWall.ok) assert.match(duplicateWall.error, /north/);
