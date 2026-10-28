import assert from "node:assert/strict";

import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import {
  parseGeneratedPlan,
  parseStoredPlan,
  resolvePlanBeat,
  type CampaignPlan,
} from "@/rpg/lib/campaign-plan";

const settings = { enemyDifficulty: "standard" } as CampaignSettings;

function room(
  id: string,
  name: string,
  role: "start" | "path" | "finale",
  exits: string[],
) {
  return { id, name, summary: `${name} holds the next step of the quest.`, exits, role };
}

function gate(
  id: string,
  roomId: string,
  kind: "lock" | "boss" | "obstacle" | "clue",
  label: string,
) {
  return { id, roomId, kind, label, detail: `${label} must be resolved before the quest can end.` };
}

function validBody() {
  return {
    rooms: [
      room("gatehouse", "Gatehouse", "start", ["yard"]),
      room("yard", "Yard", "path", ["gatehouse", "chapel", "crypt"]),
      room("chapel", "Chapel", "path", ["yard"]),
      room("crypt", "Crypt", "path", ["yard", "vault"]),
      room("armory", "Armory", "path", ["crypt"]),
      room("vault", "Vault", "finale", ["crypt"]),
    ],
    gates: [
      gate("barred-door", "gatehouse", "lock", "Barred door"),
      gate("chapel-relic", "chapel", "clue", "Chapel relic"),
      gate("crypt-warden", "crypt", "boss", "Crypt warden"),
      gate("vault-lord", "vault", "boss", "Vault lord"),
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
  assert.equal(generated.value.currentRoomId, "gatehouse");
  assert.equal(generated.value.gates.every((entry) => entry.status === "pending"), true);
  const armory = generated.value.rooms.find((entry) => entry.id === "armory");
  const crypt = generated.value.rooms.find((entry) => entry.id === "crypt");
  assert.equal(crypt?.exits.includes("armory"), true);
  assert.equal(armory?.exits.includes("crypt"), true);
}

const shortcut = parseGeneratedPlan(
  {
    rooms: [
      room("gatehouse", "Gatehouse", "start", ["vault", "yard"]),
      room("yard", "Yard", "path", ["gatehouse", "chapel"]),
      room("chapel", "Chapel", "path", ["yard", "crypt"]),
      room("crypt", "Crypt", "path", ["chapel", "armory"]),
      room("armory", "Armory", "path", ["crypt"]),
      room("vault", "Vault", "finale", ["gatehouse"]),
    ],
    gates: validBody().gates,
  },
  settings,
);
assert.equal(shortcut.ok, false);

const direct = plan();
const invented = resolvePlanBeat(
  { roomId: "vault", clearedGateIds: [], place: "Vault" },
  direct,
  "",
  true,
);
assert.equal(invented.ok, false);

const renamed = resolvePlanBeat({ roomId: "", clearedGateIds: [] }, direct, "A new town", true);
assert.equal(renamed.ok, false);

const cleared = resolvePlanBeat(
  { roomId: "yard", clearedGateIds: ["barred-door"] },
  direct,
  "",
  true,
);
assert.equal(cleared.ok, true);
if (cleared.ok) {
  assert.equal(cleared.value.place, "Yard");
  assert.equal(cleared.value.planUpdate?.currentRoomId, "yard");
  assert.equal(
    cleared.value.planUpdate?.gates.find((entry) => entry.id === "barred-door")?.status,
    "cleared",
  );
}

const earlyFinale = resolvePlanBeat({ roomId: "vault", clearedGateIds: [] }, direct, "", true);
assert.equal(earlyFinale.ok, false);

const atCrypt = parseStoredPlan({
  ...validBody(),
  currentRoomId: "crypt",
  gates: validBody().gates.map((entry) => ({
    ...entry,
    status: entry.roomId === "vault" ? "pending" : "cleared",
  })),
});
assert.equal(atCrypt.ok, true);
if (atCrypt.ok) {
  const intoFinale = resolvePlanBeat({ roomId: "vault", clearedGateIds: [] }, atCrypt.value, "", true);
  assert.equal(intoFinale.ok, true);
  if (intoFinale.ok) assert.equal(intoFinale.value.planUpdate?.currentRoomId, "vault");

  const blocked = parseStoredPlan({ ...validBody(), currentRoomId: "crypt" });
  assert.equal(blocked.ok, true);
  if (blocked.ok) {
    const refused = resolvePlanBeat({ roomId: "vault", clearedGateIds: [] }, blocked.value, "", true);
    assert.equal(refused.ok, false);
  }
}

const duringCheck = resolvePlanBeat({ roomId: "yard", clearedGateIds: ["barred-door"] }, direct, "", false);
assert.equal(duringCheck.ok, false);

const missing = resolvePlanBeat({ narration: "The door holds." }, direct, "", true);
assert.equal(missing.ok, false);

const stored = parseStoredPlan({
  ...validBody(),
  currentRoomId: "crypt",
  gates: validBody().gates.map((entry) =>
    entry.id === "barred-door" ? { ...entry, status: "cleared" } : entry,
  ),
});
assert.equal(stored.ok, true);
if (stored.ok) {
  assert.equal(stored.value.currentRoomId, "crypt");
  assert.equal(stored.value.gates.find((entry) => entry.id === "barred-door")?.status, "cleared");
  assert.equal(stored.value.gates.find((entry) => entry.id === "chapel-relic")?.status, "pending");
}

console.log("campaign plan checks passed");
