import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { CharacterDraft } from "@/rpg/lib/character";
import { coreCharacterOptions } from "@/rpg/lib/character-options";
import { buildLobbyRoster, joiningCount, peerLeft } from "@/rpg/lib/lobby-presence";
import { commitCharacter, createTable, openLobby } from "@/rpg/lib/table";

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

const waiting = createTable("ABCDEF", settings);
const blocked = commitCharacter(waiting, draft, "peer");
assert.equal(blocked.ok, false);

const lobby = openLobby({ ...waiting, revision: 1 });
assert.equal(lobby.phase, "lobby");
assert.equal(lobby.revision, 1);
assert.equal(lobby.characters.length, 0);

const created = commitCharacter(lobby, draft, "peer");
assert.equal(created.ok, true);
if (!created.ok) throw new Error("peer create failed");
assert.equal(created.table.phase, "lobby");
assert.equal(created.table.revision, 2);
assert.equal(created.character.owner, "peer");
assert.equal(
  created.table.characters.some((character) => character.owner === "host"),
  false,
);

const peers = [
  { id: "guest-1", characterId: null },
  { id: "guest-2", characterId: "pc_ada" },
];
const characters = [{ id: "pc_ada", name: "Ada" }];
const before = buildLobbyRoster({
  hostId: "host",
  hostCharacter: null,
  peers,
  departed: [],
  characters,
});
assert.equal(joiningCount(before), 2);

const emptyLeft = peerLeft(peers, [], "guest-1");
const afterEmpty = buildLobbyRoster({
  hostId: "host",
  hostCharacter: null,
  peers: emptyLeft.peers,
  departed: emptyLeft.departed,
  characters,
});
assert.equal(emptyLeft.departed.length, 0);
assert.equal(
  afterEmpty.some((player) => player.id === "guest-1"),
  false,
);
assert.equal(joiningCount(afterEmpty), 1);

const sheetLeft = peerLeft(emptyLeft.peers, emptyLeft.departed, "guest-2");
const afterSheet = buildLobbyRoster({
  hostId: "host",
  hostCharacter: null,
  peers: sheetLeft.peers,
  departed: sheetLeft.departed,
  characters,
});
const departed = afterSheet.find((player) => player.characterId === "pc_ada");
assert.equal(departed?.connected, false);
assert.equal(departed?.name, "Ada");
assert.equal(joiningCount(afterSheet), 1);
assert.equal(
  sheetLeft.peers.some((peer) => peer.id === "guest-2"),
  false,
);

const again = peerLeft(sheetLeft.peers, sheetLeft.departed, "guest-2");
assert.equal(again.departed.length, 1);

console.log("lobby presence checks passed");
