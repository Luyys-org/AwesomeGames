import type { CampaignPlan, RoomExit } from "@/rpg/lib/campaign-plan";

export const ROOM_MAP_SHAPE_MAX = 200;
export const ROOM_MAP_FEATURES_MAX = 400;
export const ROOM_MAP_PROMPT_MAX = 1000;

const PLAN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAP_ID = /^map_[0-9a-f]{8}$/;
const PLACE_ID_MAX = 24;

export const ROOM_MAP_WALLS = ["north", "east", "south", "west"] as const;

export type RoomMapWall = (typeof ROOM_MAP_WALLS)[number];

export interface RoomMapDoor {
  placeId: string;
  wall: RoomMapWall;
}

export interface RoomMapDoorLabel {
  wall: RoomMapWall;
  name: string;
}

export interface RoomMapPlan {
  shape: string;
  features: string;
  doors: RoomMapDoor[];
}

export interface StoredRoomMap {
  placeId: string;
  imageId: string;
  doors: RoomMapDoor[];
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function isRoomMapWall(value: unknown): value is RoomMapWall {
  return ROOM_MAP_WALLS.some((wall) => wall === value);
}

export function readRoomMapImageId(value: unknown): string | null {
  if (typeof value !== "string" || !MAP_ID.test(value)) return null;
  return value;
}

export function parseRoomMapDoorLabels(value: unknown): RoomMapDoorLabel[] {
  if (!Array.isArray(value)) return [];
  const doors: RoomMapDoorLabel[] = [];
  const walls = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isRoomMapWall(entry.wall) || walls.has(entry.wall)) continue;
    if (typeof entry.name !== "string") continue;
    const name = entry.name.trim();
    if (name.length === 0 || name.length > 80) continue;
    walls.add(entry.wall);
    doors.push({ wall: entry.wall, name });
  }
  return doors;
}

export function checkRoomMapDoors(
  doors: readonly RoomMapDoor[],
  exits: readonly RoomExit[],
): { ok: true } | { ok: false; error: string } {
  const expected = exits.map((exit) => exit.placeId);
  const seenPlaces = new Set<string>();
  const seenWalls = new Set<string>();

  for (const door of doors) {
    if (!expected.includes(door.placeId)) {
      return { ok: false, error: `Door placeId ${door.placeId} is not an exit of this room.` };
    }
    if (seenPlaces.has(door.placeId)) {
      return { ok: false, error: `Exit ${door.placeId} is listed twice.` };
    }
    seenPlaces.add(door.placeId);
    if (seenWalls.has(door.wall)) {
      return { ok: false, error: `Two doors use the ${door.wall} wall.` };
    }
    seenWalls.add(door.wall);
  }

  for (const placeId of expected) {
    if (!seenPlaces.has(placeId)) {
      return { ok: false, error: `Missing a door for exit ${placeId}.` };
    }
  }
  return { ok: true };
}

export function parseRoomMapPlan(value: unknown, exits: readonly RoomExit[]): Parsed<RoomMapPlan> {
  if (!isRecord(value)) return { ok: false, error: "Response JSON must be an object." };
  const shape = readLine(value.shape, ROOM_MAP_SHAPE_MAX, "shape");
  if (!shape.ok) return shape;
  const features = readLine(value.features, ROOM_MAP_FEATURES_MAX, "features");
  if (!features.ok) return features;
  if (!Array.isArray(value.doors)) return { ok: false, error: "doors must be an array." };

  const doors: RoomMapDoor[] = [];
  for (const entry of value.doors) {
    const door = readDoor(entry);
    if (!door.ok) return door;
    doors.push(door.value);
  }
  const checked = checkRoomMapDoors(doors, exits);
  if (!checked.ok) return checked;
  return { ok: true, value: { shape: shape.value, features: features.value, doors } };
}

export function normalizeStoredRoomMaps(value: unknown): StoredRoomMap[] {
  if (!Array.isArray(value)) return [];
  const byPlace = new Map<string, StoredRoomMap>();
  for (const entry of value) {
    const stored = readStoredRoomMap(entry);
    if (stored) byPlace.set(stored.placeId, stored);
  }
  return [...byPlace.values()].slice(0, 64);
}

export function storedRoomMapForPlace(maps: readonly StoredRoomMap[], placeId: string): StoredRoomMap | null {
  if (!placeId) return null;
  return maps.find((entry) => entry.placeId === placeId) ?? null;
}

export function placeNameInPlan(plan: CampaignPlan | null, placeId: string): string {
  if (!plan) return placeId;
  for (const scene of plan.scenes) {
    const place = scene.places.find((entry) => entry.id === placeId);
    if (place) return place.name;
  }
  return placeId;
}

export function roomMapDoorLabels(plan: CampaignPlan | null, doors: readonly RoomMapDoor[]): RoomMapDoorLabel[] {
  return doors.map((door) => ({
    wall: door.wall,
    name: placeNameInPlan(plan, door.placeId),
  }));
}

export function buildRoomMapImagePrompt(input: {
  universeType: string;
  placeName: string;
  shape: string;
  features: string;
  doors: readonly RoomMapDoor[];
}): string {
  const doorLine =
    input.doors.length === 0
      ? "Solid walls and no doors."
      : `Doors: ${input.doors.map((door) => `one door centered on the ${door.wall} wall`).join("; ")}.`;
  const text = [
    "Orthographic top-down floor plan of one room, camera directly overhead, flat even light.",
    `Setting: ${input.universeType}.`,
    `Room: ${input.placeName}.`,
    `Shape: ${input.shape}.`,
    `Features: ${input.features}.`,
    doorLine,
    "No people, creatures, text, labels, logos, or watermarks.",
  ].join(" ");
  return text.length <= ROOM_MAP_PROMPT_MAX ? text : text.slice(0, ROOM_MAP_PROMPT_MAX);
}

function readStoredRoomMap(value: unknown): StoredRoomMap | null {
  if (!isRecord(value)) return null;
  const placeId = readPlanId(value.placeId);
  const imageId = typeof value.imageId === "string" && MAP_ID.test(value.imageId) ? value.imageId : null;
  if (!placeId || !imageId || !Array.isArray(value.doors) || value.doors.length > ROOM_MAP_WALLS.length) return null;

  const doors: RoomMapDoor[] = [];
  const places = new Set<string>();
  const walls = new Set<string>();
  for (const entry of value.doors) {
    const door = readDoor(entry);
    if (!door.ok) return null;
    if (places.has(door.value.placeId) || walls.has(door.value.wall)) return null;
    places.add(door.value.placeId);
    walls.add(door.value.wall);
    doors.push(door.value);
  }
  return { placeId, imageId, doors };
}

function readDoor(value: unknown): Parsed<RoomMapDoor> {
  if (!isRecord(value)) return { ok: false, error: "Each door needs a placeId and a wall." };
  const placeId = readPlanId(value.placeId);
  if (!placeId) return { ok: false, error: "Each door placeId must be an id from the campaign plan." };
  if (!isRoomMapWall(value.wall)) {
    return { ok: false, error: "Each door wall must be north, east, south, or west." };
  }
  return { ok: true, value: { placeId, wall: value.wall } };
}

function readPlanId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!PLAN_ID.test(trimmed) || trimmed.length > PLACE_ID_MAX) return null;
  return trimmed;
}

function readLine(value: unknown, max: number, label: string): Parsed<string> {
  if (typeof value !== "string" || value.includes("\n") || value.includes("\r")) {
    return { ok: false, error: `${label} must be a single line.` };
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > max) {
    return { ok: false, error: `${label} must be 1 to ${max} characters.` };
  }
  return { ok: true, value: trimmed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
