import type { CampaignSettings, EnemyDifficultyId } from "@/rpg/lib/campaign-settings";

export const PLAN_ID_MAX = 24;
export const PLAN_NAME_MAX = 40;
export const PLAN_SUMMARY_MAX = 100;
export const PLAN_LABEL_MAX = 40;
export const PLAN_DETAIL_MAX = 120;

const PLAN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROOM_ROLES = ["start", "path", "finale"] as const;
const GATE_KINDS = ["lock", "boss", "obstacle", "clue"] as const;
const GATE_STATUSES = ["pending", "cleared"] as const;

export type PlanRoomRole = (typeof ROOM_ROLES)[number];
export type PlanGateKind = (typeof GATE_KINDS)[number];
export type PlanGateStatus = (typeof GATE_STATUSES)[number];

export interface PlanRoom {
  id: string;
  name: string;
  summary: string;
  exits: string[];
  role: PlanRoomRole;
}

export interface PlanGate {
  id: string;
  roomId: string;
  kind: PlanGateKind;
  label: string;
  detail: string;
  status: PlanGateStatus;
}

export interface CampaignPlan {
  rooms: PlanRoom[];
  gates: PlanGate[];
  currentRoomId: string;
}

export interface PlanBounds {
  roomMin: number;
  roomMax: number;
  gateMin: number;
  gateMax: number;
  pathMin: number;
  id: number;
  name: number;
  summary: number;
  label: number;
  detail: number;
}

export interface PlanStartRoom {
  id: string;
  name: string;
  summary: string;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const BOUNDS: Record<EnemyDifficultyId, Pick<PlanBounds, "roomMin" | "roomMax" | "gateMin" | "gateMax" | "pathMin">> = {
  easy: { roomMin: 5, roomMax: 6, gateMin: 3, gateMax: 4, pathMin: 4 },
  standard: { roomMin: 6, roomMax: 7, gateMin: 4, gateMax: 5, pathMin: 4 },
  hard: { roomMin: 7, roomMax: 8, gateMin: 5, gateMax: 6, pathMin: 5 },
  severe: { roomMin: 8, roomMax: 8, gateMin: 6, gateMax: 6, pathMin: 5 },
};

const TURN_RULES = `The campaign plan is canon. Do not add, remove, or rename rooms or gates.
roomId is an empty string to stay, or the id of the current room, or one id in that room's exits. Do not invent a place. When roomId names a different room, place is that room's name. When you stay, place is empty or the current room's name.
clearedGateIds is empty, or one pending gate id whose room is the current room. Clear a gate only when this beat resolves it. A check that has not succeeded clears nothing and does not change roomId. If the fiction already resolved a pending gate in this room, include its id even when this beat has no new roll.
Do not set roomId to the finale while mayEnterFinale is false. Do not narrate the principal quest as finished unless every gate is already cleared and the party is in the finale, or this beat clears the last pending gate and that gate is in the finale.
Aim narration and the next actions at nextGate, or at travel along exits toward that gate's room. Do not skip ahead.`;

const NO_PLAN_RULES =
  "No campaign plan is stored. Return roomId as an empty string and clearedGateIds as an empty array.";

const LOADOUT_NOTE = `The campaign plan is the map. The party is in currentRoomId. The first actions pursue nextGate, or travel along an exit toward that gate's room. Do not offer an action that enters the finale while mayEnterFinale is false, or that finishes the principal quest while mayFinishObjective is false.`;

export function planBounds(difficulty: EnemyDifficultyId): PlanBounds {
  return {
    ...BOUNDS[difficulty],
    id: PLAN_ID_MAX,
    name: PLAN_NAME_MAX,
    summary: PLAN_SUMMARY_MAX,
    label: PLAN_LABEL_MAX,
    detail: PLAN_DETAIL_MAX,
  };
}

export function planStartRoom(plan: CampaignPlan): PlanStartRoom | null {
  const start = plan.rooms.find((room) => room.role === "start");
  if (!start) return null;
  return { id: start.id, name: start.name, summary: start.summary };
}

export function planForPrompt(plan: CampaignPlan | null): Record<string, unknown> | null {
  if (!plan) return null;
  const finale = plan.rooms.find((room) => room.role === "finale");
  const finaleId = finale?.id ?? "";
  const pending = plan.gates.filter((gate) => gate.status === "pending");
  const next = nextGate(plan);
  return {
    currentRoomId: plan.currentRoomId,
    finaleRoomId: finaleId,
    mayEnterFinale: !pending.some((gate) => gate.roomId !== finaleId),
    mayFinishObjective: pending.length === 0 && plan.currentRoomId === finaleId,
    nextGate: next
      ? { id: next.id, roomId: next.roomId, kind: next.kind, label: next.label, detail: next.detail }
      : null,
    pendingHere: pending.filter((gate) => gate.roomId === plan.currentRoomId).map((gate) => gate.id),
    rooms: plan.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      summary: room.summary,
      exits: room.exits,
      role: room.role,
    })),
    gates: plan.gates.map((gate) => ({
      id: gate.id,
      roomId: gate.roomId,
      kind: gate.kind,
      label: gate.label,
      detail: gate.detail,
      status: gate.status,
    })),
  };
}

export function planRulesForTurn(plan: CampaignPlan | null): string {
  return plan ? TURN_RULES : NO_PLAN_RULES;
}

export function planNoteForLoadout(plan: CampaignPlan | null): string {
  return plan ? LOADOUT_NOTE : "";
}

export function parseGeneratedPlan(value: unknown, settings: CampaignSettings): Parsed<CampaignPlan> {
  const structure = parsePlanStructure(value);
  if (!structure.ok) return structure;
  const bounds = planBounds(settings.enemyDifficulty);
  const { rooms, gates } = structure.value;
  if (rooms.length < bounds.roomMin || rooms.length > bounds.roomMax) {
    return {
      ok: false,
      error: `Return ${bounds.roomMin} to ${bounds.roomMax} rooms for this enemy difficulty.`,
    };
  }
  if (gates.length < bounds.gateMin || gates.length > bounds.gateMax) {
    return {
      ok: false,
      error: `Return ${bounds.gateMin} to ${bounds.gateMax} gates for this enemy difficulty.`,
    };
  }

  const start = rooms.find((room) => room.role === "start");
  const finale = rooms.find((room) => room.role === "finale");
  if (!start || !finale) return { ok: false, error: "The plan needs one start room and one finale room." };

  const path = shortestPath(rooms, start.id, finale.id);
  if (!path) return { ok: false, error: "The finale must be reachable from the start room." };
  if (path.length < bounds.pathMin) {
    return {
      ok: false,
      error: `The shortest path from start to finale must include at least ${bounds.pathMin} rooms.`,
    };
  }

  const finaleGates = gates.filter((gate) => gate.roomId === finale.id);
  if (finaleGates.length !== 1 || finaleGates[0]?.kind !== "boss") {
    return { ok: false, error: "The finale room needs exactly one gate, and its kind is boss." };
  }
  const beforeFinale = gates.filter((gate) => gate.roomId !== finale.id);
  if (beforeFinale.length < 2) {
    return { ok: false, error: "At least two gates must sit outside the finale." };
  }
  if (!beforeFinale.some((gate) => gate.roomId !== start.id)) {
    return { ok: false, error: "At least one gate must sit in a room that is neither the start nor the finale." };
  }

  const middle = path.slice(1, -1);
  const gatedMiddle = middle.filter((id) => gates.some((gate) => gate.roomId === id));
  const needed = Math.ceil(middle.length / 2);
  if (gatedMiddle.length < needed) {
    return {
      ok: false,
      error: "Put a gate in enough rooms on the path between the start and the finale. Do not leave that path empty.",
    };
  }

  return {
    ok: true,
    value: {
      rooms,
      gates: gates.map((gate) => ({ ...gate, status: "pending" })),
      currentRoomId: start.id,
    },
  };
}

export function parseStoredPlan(value: unknown): Parsed<CampaignPlan> {
  const structure = parsePlanStructure(value);
  if (!structure.ok) return structure;
  if (!isRecord(value) || typeof value.currentRoomId !== "string") {
    return { ok: false, error: "The campaign plan needs a current room." };
  }
  const currentRoomId = value.currentRoomId.trim();
  if (!structure.value.rooms.some((room) => room.id === currentRoomId)) {
    return { ok: false, error: "The current room is not on the campaign plan." };
  }
  const gates = structure.value.gates.map((gate) => {
    const source = gateSource(value, gate.id);
    const status = source && isGateStatus(source.status) ? source.status : "pending";
    return { ...gate, status };
  });
  if (!structure.value.rooms.some((room) => room.role === "finale")) {
    return { ok: false, error: "The campaign plan needs a finale room." };
  }
  if (gates.length === 0) return { ok: false, error: "The campaign plan needs at least one gate." };
  return { ok: true, value: { rooms: structure.value.rooms, gates, currentRoomId } };
}

export function readStoredCampaignPlan(value: unknown): CampaignPlan | null {
  if (value == null) return null;
  const parsed = parseStoredPlan(value);
  return parsed.ok ? parsed.value : null;
}

export function resolvePlanBeat(
  raw: unknown,
  plan: CampaignPlan | null,
  place: string,
  allowProgress: boolean,
): Parsed<{ place: string; planUpdate: CampaignPlan | null }> {
  if (!plan) return { ok: true, value: { place, planUpdate: null } };
  if (!isRecord(raw)) return { ok: false, error: "Response JSON must be an object." };

  if (typeof raw.roomId !== "string") {
    return { ok: false, error: "roomId must be a string. Use an empty string to stay." };
  }
  if (!Array.isArray(raw.clearedGateIds)) {
    return { ok: false, error: "clearedGateIds must be an array. Use [] when no gate is resolved." };
  }
  const requested = readRoomId(raw.roomId);
  if (!requested.ok) return requested;
  const cleared = readClearedIds(raw.clearedGateIds);
  if (!cleared.ok) return cleared;

  const current = plan.rooms.find((room) => room.id === plan.currentRoomId);
  if (!current) return { ok: false, error: "The campaign plan has no current room." };

  if (!allowProgress) {
    if (cleared.value.length > 0) {
      return { ok: false, error: "Do not clear a gate before the check succeeds." };
    }
    if (requested.value.length > 0 && requested.value !== plan.currentRoomId) {
      return { ok: false, error: "Do not change rooms before the check succeeds." };
    }
    const stayed = stayPlace(place, current.name);
    if (!stayed.ok) return stayed;
    return { ok: true, value: { place: stayed.value, planUpdate: plan } };
  }

  if (requested.value.length > 0 && !plan.rooms.some((room) => room.id === requested.value)) {
    return { ok: false, error: "roomId must be empty or a room id from the campaign plan." };
  }

  const destinationId = requested.value.length > 0 ? requested.value : plan.currentRoomId;
  if (destinationId !== plan.currentRoomId && !current.exits.includes(destinationId)) {
    return { ok: false, error: "roomId must be the current room or a room in its exits." };
  }
  const destination = plan.rooms.find((room) => room.id === destinationId);
  if (!destination) return { ok: false, error: "roomId must be a room id from the campaign plan." };

  if (cleared.value.length > 1) return { ok: false, error: "Clear at most one gate in a beat." };

  const gates = plan.gates.map((gate) => ({ ...gate }));
  if (cleared.value.length === 1) {
    const gateId = cleared.value[0] ?? "";
    const gate = gates.find((entry) => entry.id === gateId);
    if (!gate) return { ok: false, error: "clearedGateIds must name a gate on the campaign plan." };
    if (gate.status === "cleared") return { ok: false, error: "That gate is already cleared." };
    if (gate.roomId !== plan.currentRoomId) {
      return { ok: false, error: "Clear a gate only in the room where the party already is." };
    }
    gate.status = "cleared";
  }

  const finale = plan.rooms.find((room) => room.role === "finale");
  if (finale && destinationId === finale.id && destinationId !== plan.currentRoomId) {
    const blocking = gates.some((gate) => gate.status === "pending" && gate.roomId !== finale.id);
    if (blocking) {
      return { ok: false, error: "Do not enter the finale until every gate outside it is cleared." };
    }
  }

  const moved = destinationId !== plan.currentRoomId;
  if (!moved) {
    const stayed = stayPlace(place, current.name);
    if (!stayed.ok) return stayed;
    return {
      ok: true,
      value: {
        place: stayed.value,
        planUpdate: { rooms: plan.rooms, gates, currentRoomId: destinationId },
      },
    };
  }

  return {
    ok: true,
    value: {
      place: destination.name,
      planUpdate: { rooms: plan.rooms, gates, currentRoomId: destinationId },
    },
  };
}

function parsePlanStructure(value: unknown): Parsed<{ rooms: PlanRoom[]; gates: PlanGate[] }> {
  if (!isRecord(value) || !Array.isArray(value.rooms) || !Array.isArray(value.gates)) {
    return { ok: false, error: "The plan must be an object with rooms and gates arrays." };
  }
  if (value.rooms.length === 0 || value.rooms.length > 8) {
    return { ok: false, error: "Return between 1 and 8 rooms." };
  }
  if (value.gates.length > 8) return { ok: false, error: "Return at most 8 gates." };

  const rooms: PlanRoom[] = [];
  const seenRooms = new Set<string>();
  const seenNames = new Set<string>();
  for (const entry of value.rooms) {
    const room = readRoom(entry);
    if (!room.ok) return room;
    if (seenRooms.has(room.value.id)) return { ok: false, error: `Room id ${room.value.id} is duplicated.` };
    const nameKey = room.value.name.toLowerCase();
    if (seenNames.has(nameKey)) return { ok: false, error: "Two rooms share a name." };
    seenRooms.add(room.value.id);
    seenNames.add(nameKey);
    rooms.push(room.value);
  }

  const starts = rooms.filter((room) => room.role === "start");
  const finales = rooms.filter((room) => room.role === "finale");
  if (starts.length !== 1 || finales.length !== 1) {
    return { ok: false, error: "Use exactly one start room and one finale room. Every other room is path." };
  }

  for (const room of rooms) {
    for (const exit of room.exits) {
      if (exit === room.id) return { ok: false, error: `Room ${room.id} cannot exit to itself.` };
      if (!seenRooms.has(exit)) return { ok: false, error: `Room ${room.id} exits to unknown room ${exit}.` };
    }
  }

  const linked = symmetrize(rooms);
  if (!reachable(linked, starts[0]?.id ?? "")) {
    return { ok: false, error: "Every room must be reachable from the start room." };
  }

  const gates: PlanGate[] = [];
  const seenGates = new Set<string>();
  for (const entry of value.gates) {
    const gate = readGate(entry, seenRooms);
    if (!gate.ok) return gate;
    if (seenGates.has(gate.value.id)) return { ok: false, error: `Gate id ${gate.value.id} is duplicated.` };
    seenGates.add(gate.value.id);
    gates.push(gate.value);
  }

  return { ok: true, value: { rooms: linked, gates } };
}

function readRoom(value: unknown): Parsed<PlanRoom> {
  if (!isRecord(value)) return { ok: false, error: "Each room needs id, name, summary, exits, and role." };
  const id = readId(value.id, "Room id");
  if (!id.ok) return id;
  const name = readText(value.name, "Room name", PLAN_NAME_MAX);
  if (!name.ok) return name;
  const summary = readText(value.summary, "Room summary", PLAN_SUMMARY_MAX);
  if (!summary.ok) return summary;
  if (!isRoomRole(value.role)) return { ok: false, error: "Room role must be start, path, or finale." };
  if (!Array.isArray(value.exits)) return { ok: false, error: `Exits for ${id.value} must be an array of room ids.` };
  const exits: string[] = [];
  for (const exit of value.exits) {
    const exitId = readId(exit, "Exit id");
    if (!exitId.ok) return exitId;
    if (!exits.includes(exitId.value)) exits.push(exitId.value);
  }
  return { ok: true, value: { id: id.value, name: name.value, summary: summary.value, exits, role: value.role } };
}

function readGate(value: unknown, rooms: Set<string>): Parsed<PlanGate> {
  if (!isRecord(value)) return { ok: false, error: "Each gate needs id, roomId, kind, label, and detail." };
  const id = readId(value.id, "Gate id");
  if (!id.ok) return id;
  const roomId = readId(value.roomId, "Gate roomId");
  if (!roomId.ok) return roomId;
  if (!rooms.has(roomId.value)) return { ok: false, error: `Gate ${id.value} names an unknown room.` };
  if (!isGateKind(value.kind)) return { ok: false, error: "Gate kind must be lock, boss, obstacle, or clue." };
  const label = readText(value.label, "Gate label", PLAN_LABEL_MAX);
  if (!label.ok) return label;
  const detail = readText(value.detail, "Gate detail", PLAN_DETAIL_MAX);
  if (!detail.ok) return detail;
  return {
    ok: true,
    value: {
      id: id.value,
      roomId: roomId.value,
      kind: value.kind,
      label: label.value,
      detail: detail.value,
      status: "pending",
    },
  };
}

function readId(value: unknown, label: string): Parsed<string> {
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string.` };
  const trimmed = value.trim();
  if (!PLAN_ID.test(trimmed) || trimmed.length > PLAN_ID_MAX) {
    return {
      ok: false,
      error: `${label} must be 1 to ${PLAN_ID_MAX} characters: lowercase letters, digits, and hyphens.`,
    };
  }
  return { ok: true, value: trimmed };
}

function readText(value: unknown, label: string, max: number): Parsed<string> {
  if (typeof value !== "string" || value.includes("\n") || value.includes("\r")) {
    return { ok: false, error: `${label} must be a single line.` };
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > max) {
    return { ok: false, error: `${label} must be 1 to ${max} characters.` };
  }
  return { ok: true, value: trimmed };
}

function readRoomId(value: unknown): Parsed<string> {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "roomId must be a string." };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: "" };
  if (!PLAN_ID.test(trimmed)) return { ok: false, error: "roomId must be empty or a room id from the campaign plan." };
  return { ok: true, value: trimmed };
}

function readClearedIds(value: unknown): Parsed<string[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "clearedGateIds must be an array." };
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return { ok: false, error: "Each clearedGateIds entry must be a string." };
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (!ids.includes(trimmed)) ids.push(trimmed);
  }
  return { ok: true, value: ids };
}

function stayPlace(place: string, roomName: string): Parsed<string> {
  const trimmed = place.trim();
  if (trimmed.length === 0) return { ok: true, value: "" };
  if (trimmed.toLowerCase() === roomName.toLowerCase()) return { ok: true, value: roomName };
  return {
    ok: false,
    error: "Place must stay empty or match the current room. Set roomId to an adjacent room to travel. Do not invent a place.",
  };
}

function symmetrize(rooms: PlanRoom[]): PlanRoom[] {
  const byId = new Map(rooms.map((room) => [room.id, { ...room, exits: [...room.exits] }]));
  for (const room of byId.values()) {
    for (const exit of [...room.exits]) {
      const other = byId.get(exit);
      if (other && !other.exits.includes(room.id)) other.exits.push(room.id);
    }
  }
  return [...byId.values()];
}

function reachable(rooms: PlanRoom[], startId: string): boolean {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const seen = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const room = byId.get(id);
    if (!room) continue;
    for (const exit of room.exits) {
      if (!seen.has(exit)) queue.push(exit);
    }
  }
  return seen.size === rooms.length;
}

function shortestPath(rooms: PlanRoom[], startId: string, finaleId: string): string[] | null {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const queue: string[][] = [[startId]];
  const seen = new Set<string>([startId]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    const last = path[path.length - 1] ?? "";
    if (last === finaleId) return path;
    const room = byId.get(last);
    if (!room) continue;
    for (const exit of room.exits) {
      if (seen.has(exit)) continue;
      seen.add(exit);
      queue.push([...path, exit]);
    }
  }
  return null;
}

function nextGate(plan: CampaignPlan): PlanGate | null {
  const pending = plan.gates.filter((gate) => gate.status === "pending");
  const here = pending.find((gate) => gate.roomId === plan.currentRoomId);
  if (here) return here;

  const byId = new Map(plan.rooms.map((room) => [room.id, room]));
  const seen = new Set<string>([plan.currentRoomId]);
  const queue = [...(byId.get(plan.currentRoomId)?.exits ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const gate = pending.find((entry) => entry.roomId === id);
    if (gate) return gate;
    for (const exit of byId.get(id)?.exits ?? []) {
      if (!seen.has(exit)) queue.push(exit);
    }
  }
  return pending[0] ?? null;
}

function gateSource(value: unknown, id: string): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.gates)) return null;
  for (const entry of value.gates) {
    if (isRecord(entry) && typeof entry.id === "string" && entry.id.trim() === id) return entry;
  }
  return null;
}

function isRoomRole(value: unknown): value is PlanRoomRole {
  return ROOM_ROLES.some((role) => role === value);
}

function isGateKind(value: unknown): value is PlanGateKind {
  return GATE_KINDS.some((kind) => kind === value);
}

function isGateStatus(value: unknown): value is PlanGateStatus {
  return GATE_STATUSES.some((status) => status === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
