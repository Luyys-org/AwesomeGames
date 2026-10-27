export const JOURNEY_PLACE_MAX = 40;
export const JOURNEY_NPC_MAX = 40;
export const JOURNEY_EVENT_MAX = 48;
const SUMMARY_MAX = 160;
const EVENT_TEXT_MAX = 180;
const NAME_MAX = 80;

export interface JourneyPlace {
  id: string;
  name: string;
  visits: number;
}

export interface JourneyNpc {
  id: string;
  name: string;
  placeId: string;
  summary: string;
}

export interface JourneyEvent {
  placeId: string;
  scene: number;
  summary: string;
}

export interface JourneyGraph {
  places: JourneyPlace[];
  npcs: JourneyNpc[];
  events: JourneyEvent[];
  path: string[];
}

export interface JourneyNote {
  scene: number;
  place: string;
  encounter: { name: string; summary: string } | null;
  events: string[];
}

export function emptyJourney(): JourneyGraph {
  return { places: [], npcs: [], events: [], path: [] };
}

export function rememberJourney(graph: JourneyGraph, note: JourneyNote): JourneyGraph {
  const placed = touchPlace(graph, note.place);
  const met = touchNpc(placed.graph, placed.placeId, note.scene, note.encounter);
  const events = [...met.events];
  for (const summary of note.events) {
    const text = cap(summary, EVENT_TEXT_MAX);
    if (!text) continue;
    events.push({ placeId: placed.placeId, scene: note.scene, summary: text });
  }
  return {
    ...met,
    events: events.slice(-JOURNEY_EVENT_MAX),
  };
}

export function journeyForGm(graph: JourneyGraph): {
  places: { name: string; visits: number }[];
  npcs: { name: string; place: string; summary: string }[];
  recentEvents: { place: string; scene: number; summary: string }[];
} {
  const placeName = new Map(graph.places.map((place) => [place.id, place.name]));
  return {
    places: graph.places.map((place) => ({ name: place.name, visits: place.visits })),
    npcs: graph.npcs.map((npc) => ({
      name: npc.name,
      place: placeName.get(npc.placeId) ?? "",
      summary: npc.summary,
    })),
    recentEvents: graph.events.slice(-16).map((event) => ({
      place: placeName.get(event.placeId) ?? "",
      scene: event.scene,
      summary: event.summary,
    })),
  };
}

export function parseJourney(value: unknown, openingPlace = ""): JourneyGraph {
  if (!isRecord(value)) return seedPlace(openingPlace);
  const places = readPlaces(value.places);
  const npcs = readNpcs(value.npcs);
  const events = readEvents(value.events);
  const known = new Set(places.map((place) => place.id));
  const path = Array.isArray(value.path)
    ? value.path.filter((id): id is string => typeof id === "string" && known.has(id)).slice(-64)
    : [];
  if (places.length === 0) return seedPlace(openingPlace);
  return { places, npcs, events, path: path.length > 0 ? path : places.slice(-1).map((place) => place.id) };
}

function seedPlace(place: string): JourneyGraph {
  return rememberJourney(emptyJourney(), { scene: 1, place, encounter: null, events: [] });
}

function touchPlace(graph: JourneyGraph, place: string): { graph: JourneyGraph; placeId: string } {
  const name = cap(place, NAME_MAX);
  if (!name) {
    return { graph, placeId: graph.path[graph.path.length - 1] ?? "" };
  }
  const id = slug(name);
  if (!id) {
    return { graph, placeId: graph.path[graph.path.length - 1] ?? "" };
  }
  const places = graph.places.map((entry) => ({ ...entry }));
  let found = places.find((entry) => entry.id === id);
  const current = graph.path[graph.path.length - 1] ?? "";
  if (!found) {
    if (places.length >= JOURNEY_PLACE_MAX) {
      const drop = places.findIndex((entry) => entry.id !== current);
      if (drop >= 0) places.splice(drop, 1);
    }
    if (places.length >= JOURNEY_PLACE_MAX) {
      return { graph, placeId: current };
    }
    found = { id, name, visits: 0 };
    places.push(found);
  }
  let path = graph.path;
  if (current !== id) {
    found.visits += 1;
    path = [...path, id].slice(-64);
  }
  return { graph: { ...graph, places, path }, placeId: id };
}

function touchNpc(
  graph: JourneyGraph,
  placeId: string,
  scene: number,
  encounter: JourneyNote["encounter"],
): JourneyGraph {
  if (!encounter || !placeId) return graph;
  const name = cap(encounter.name, 48);
  if (!name) return graph;
  const id = slug(name);
  if (!id) return graph;
  const summary = cap(encounter.summary, SUMMARY_MAX);
  const npcs = graph.npcs.map((entry) => ({ ...entry }));
  const existing = npcs.find((entry) => entry.id === id);
  const events = [...graph.events];
  if (!existing) {
    if (npcs.length >= JOURNEY_NPC_MAX) npcs.shift();
    npcs.push({ id, name, placeId, summary });
    events.push({ placeId, scene, summary: `Met ${name}.` });
  } else if (existing.placeId !== placeId) {
    existing.placeId = placeId;
    if (summary) existing.summary = summary;
    events.push({ placeId, scene, summary: `Met ${name} again.` });
  } else if (summary) {
    existing.summary = summary;
  }
  return { ...graph, npcs, events };
}

function readPlaces(value: unknown): JourneyPlace[] {
  if (!Array.isArray(value)) return [];
  const places: JourneyPlace[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== "string") continue;
    const name = cap(entry.name, NAME_MAX);
    if (!name) continue;
    const id = typeof entry.id === "string" && entry.id.trim() ? slug(entry.id) : slug(name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const visits = typeof entry.visits === "number" && entry.visits > 0 ? Math.floor(entry.visits) : 1;
    places.push({ id, name, visits });
    if (places.length >= JOURNEY_PLACE_MAX) break;
  }
  return places;
}

function readNpcs(value: unknown): JourneyNpc[] {
  if (!Array.isArray(value)) return [];
  const npcs: JourneyNpc[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== "string") continue;
    const name = cap(entry.name, 48);
    const placeId = typeof entry.placeId === "string" ? slug(entry.placeId) : "";
    if (!name || !placeId) continue;
    const id = typeof entry.id === "string" && entry.id.trim() ? slug(entry.id) : slug(name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    npcs.push({
      id,
      name,
      placeId,
      summary: typeof entry.summary === "string" ? cap(entry.summary, SUMMARY_MAX) : "",
    });
    if (npcs.length >= JOURNEY_NPC_MAX) break;
  }
  return npcs;
}

function readEvents(value: unknown): JourneyEvent[] {
  if (!Array.isArray(value)) return [];
  const events: JourneyEvent[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.summary !== "string") continue;
    const summary = cap(entry.summary, EVENT_TEXT_MAX);
    if (!summary) continue;
    const scene = typeof entry.scene === "number" && entry.scene > 0 ? Math.floor(entry.scene) : 1;
    const placeId = typeof entry.placeId === "string" ? slug(entry.placeId) : "";
    events.push({ placeId, scene, summary });
  }
  return events.slice(-JOURNEY_EVENT_MAX);
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function cap(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
