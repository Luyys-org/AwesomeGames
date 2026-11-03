import type { CampaignSettings, EnemyDifficultyId } from "@/rpg/lib/campaign-settings";

export const PLAN_ID_MAX = 24;
export const PLAN_NAME_MAX = 40;
export const PLAN_SUMMARY_MAX = 400;
export const PLAN_OBJECTIVE_MAX = 280;

const PLAN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OBJECTIVE_STATUSES = ["pending", "cleared"] as const;

export type PlanObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export interface PlanPlace {
  id: string;
  name: string;
  summary: string;
  next: string;
}

export interface PlanScene {
  id: string;
  name: string;
  summary: string;
  objective: string;
  next: string;
  places: PlanPlace[];
  objectiveStatus: PlanObjectiveStatus;
}

export interface CampaignPlan {
  scenes: PlanScene[];
  currentSceneId: string;
  currentPlaceId: string;
}

export interface PlanBounds {
  sceneMin: number;
  sceneMax: number;
  placeMin: number;
  placeMax: number;
  id: number;
  name: number;
  summary: number;
  objective: number;
}

export interface PlanStartPlace {
  id: string;
  name: string;
  summary: string;
  sceneId: string;
  sceneName: string;
  objective: string;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

interface PlanLink {
  id: string;
  next: string;
}

const BOUNDS: Record<EnemyDifficultyId, Pick<PlanBounds, "sceneMin" | "sceneMax" | "placeMin" | "placeMax">> = {
  easy: { sceneMin: 2, sceneMax: 3, placeMin: 2, placeMax: 3 },
  standard: { sceneMin: 3, sceneMax: 3, placeMin: 2, placeMax: 3 },
  hard: { sceneMin: 3, sceneMax: 4, placeMin: 2, placeMax: 3 },
  severe: { sceneMin: 4, sceneMax: 4, placeMin: 2, placeMax: 3 },
};

const TURN_RULES = `The campaign plan is canon. Do not add, remove, or rename scenes, places, or scene objectives.
placeId is an empty string to stay, the current place id, or that place's next id. Do not skip a place. When placeId names the next place, place is that place's name. When you stay, place is empty or the current place's name.
sceneId is an empty string to stay, the current scene id, or the next scene id. Enter the next scene only when mayAdvanceScene is true, or when this beat clears the current scene objective. On that entry, placeId is empty or the next scene's first place id, and place is that place's name.
clearedSceneId is an empty string, or the current scene id when this beat resolves that scene's objective. Clear it only from the last place of that scene. A check that has not succeeded clears nothing and does not change placeId or sceneId.
Do not narrate the principal quest as finished unless mayFinishObjective is true, or this beat clears the last scene's objective from that scene's last place.
Aim narration and the next actions at the current scene objective, or at travel along next toward the last place of this scene. Do not skip ahead.`;

const NO_PLAN_RULES =
  "No campaign plan is stored. Return placeId, sceneId, and clearedSceneId as empty strings.";

const LOADOUT_NOTE = `The campaign plan is the map. The party is in currentPlaceId of currentSceneId. The first actions pursue that scene's objective, or travel along next toward the last place of this scene. Do not offer an action that enters the next scene while mayAdvanceScene is false, or that finishes the principal quest while mayFinishObjective is false.`;

export function planBounds(difficulty: EnemyDifficultyId): PlanBounds {
  return {
    ...BOUNDS[difficulty],
    id: PLAN_ID_MAX,
    name: PLAN_NAME_MAX,
    summary: PLAN_SUMMARY_MAX,
    objective: PLAN_OBJECTIVE_MAX,
  };
}

export function planStartPlace(plan: CampaignPlan): PlanStartPlace | null {
  const scene = plan.scenes[0];
  const place = scene?.places[0];
  if (!scene || !place) return null;
  return {
    id: place.id,
    name: place.name,
    summary: place.summary,
    sceneId: scene.id,
    sceneName: scene.name,
    objective: scene.objective,
  };
}

export function planForPrompt(plan: CampaignPlan | null): Record<string, unknown> | null {
  if (!plan) return null;
  const scene = plan.scenes.find((entry) => entry.id === plan.currentSceneId);
  const place = scene?.places.find((entry) => entry.id === plan.currentPlaceId);
  const onLastPlace = place?.next === "";
  const onLastScene = scene?.next === "";
  return {
    currentSceneId: plan.currentSceneId,
    currentPlaceId: plan.currentPlaceId,
    currentObjective: scene?.objective ?? "",
    mayAdvanceScene: Boolean(scene && scene.next !== "" && scene.objectiveStatus === "cleared"),
    mayFinishObjective: Boolean(scene && onLastScene && onLastPlace && scene.objectiveStatus === "cleared"),
    scenes: plan.scenes.map((entry) => ({
      id: entry.id,
      name: entry.name,
      summary: entry.summary,
      objective: entry.objective,
      objectiveStatus: entry.objectiveStatus,
      next: entry.next,
      places: entry.places.map((spot) => ({
        id: spot.id,
        name: spot.name,
        summary: spot.summary,
        next: spot.next,
      })),
    })),
  };
}

export function planRulesForTurn(plan: CampaignPlan | null): string {
  return plan ? TURN_RULES : NO_PLAN_RULES;
}

export function planNoteForLoadout(plan: CampaignPlan | null): string {
  return plan ? LOADOUT_NOTE : "";
}

export interface RoomExit {
  placeId: string;
  name: string;
  summary: string;
}

/** Doors for the current place: the previous and next plan links, including the scene boundary. */
export function roomExits(plan: CampaignPlan): RoomExit[] {
  const scene = plan.scenes.find((entry) => entry.id === plan.currentSceneId);
  const place = scene?.places.find((entry) => entry.id === plan.currentPlaceId);
  if (!scene || !place) return [];

  const exits: RoomExit[] = [];
  const previous = scene.places.find((entry) => entry.next === place.id);
  if (previous) {
    exits.push(toExit(previous));
  } else {
    const previousScene = plan.scenes.find((entry) => entry.next === scene.id);
    const back = previousScene?.places.find((entry) => entry.next === "");
    if (back) exits.push(toExit(back));
  }

  if (place.next !== "") {
    const next = scene.places.find((entry) => entry.id === place.next);
    if (next) exits.push(toExit(next));
  } else if (scene.next !== "") {
    const nextScene = plan.scenes.find((entry) => entry.id === scene.next);
    const forward = nextScene?.places[0];
    if (forward) exits.push(toExit(forward));
  }

  return exits;
}

function toExit(place: PlanPlace): RoomExit {
  return { placeId: place.id, name: place.name, summary: place.summary };
}

export function parseGeneratedPlan(value: unknown, settings: CampaignSettings): Parsed<CampaignPlan> {
  const structure = parsePlanStructure(value);
  if (!structure.ok) return structure;
  const bounds = planBounds(settings.enemyDifficulty);
  const { scenes } = structure.value;
  if (scenes.length < bounds.sceneMin || scenes.length > bounds.sceneMax) {
    return {
      ok: false,
      error: `Return ${bounds.sceneMin} to ${bounds.sceneMax} scenes for this enemy difficulty.`,
    };
  }
  if (scenes.some((scene) => scene.places.length < bounds.placeMin || scene.places.length > bounds.placeMax)) {
    return {
      ok: false,
      error: `Each scene needs ${bounds.placeMin} to ${bounds.placeMax} places for this enemy difficulty.`,
    };
  }
  const campaignObjective = typeof settings.objective === "string" ? settings.objective.trim().toLowerCase() : "";
  if (campaignObjective && scenes.some((scene) => scene.objective.toLowerCase() === campaignObjective)) {
    return {
      ok: false,
      error: "A scene objective must be a step toward the campaign objective, not a copy of it.",
    };
  }
  const first = scenes[0];
  const start = first?.places[0];
  if (!first || !start) return { ok: false, error: "The plan needs a first scene and a first place." };
  return {
    ok: true,
    value: {
      scenes: scenes.map((scene) => ({ ...scene, objectiveStatus: "pending" })),
      currentSceneId: first.id,
      currentPlaceId: start.id,
    },
  };
}

export function parseStoredPlan(value: unknown): Parsed<CampaignPlan> {
  const structure = parsePlanStructure(value);
  if (!structure.ok) return structure;
  if (!isRecord(value) || typeof value.currentSceneId !== "string" || typeof value.currentPlaceId !== "string") {
    return { ok: false, error: "The campaign plan needs a current scene and a current place." };
  }
  const currentSceneId = value.currentSceneId.trim();
  const currentPlaceId = value.currentPlaceId.trim();
  const scene = structure.value.scenes.find((entry) => entry.id === currentSceneId);
  if (!scene) return { ok: false, error: "The current scene is not on the campaign plan." };
  if (!scene.places.some((place) => place.id === currentPlaceId)) {
    return { ok: false, error: "The current place is not in the current scene." };
  }
  const scenes = structure.value.scenes.map((entry) => {
    const source = sceneSource(value, entry.id);
    const status = source && isObjectiveStatus(source.objectiveStatus) ? source.objectiveStatus : "pending";
    return { ...entry, objectiveStatus: status };
  });
  return { ok: true, value: { scenes, currentSceneId, currentPlaceId } };
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

  const requestedPlace = readOptionalId(raw.placeId, "placeId");
  if (!requestedPlace.ok) return requestedPlace;
  const requestedScene = readOptionalId(raw.sceneId, "sceneId");
  if (!requestedScene.ok) return requestedScene;
  const clearedScene = readOptionalId(raw.clearedSceneId, "clearedSceneId");
  if (!clearedScene.ok) return clearedScene;

  const scene = plan.scenes.find((entry) => entry.id === plan.currentSceneId);
  const spot = scene?.places.find((entry) => entry.id === plan.currentPlaceId);
  if (!scene || !spot) return { ok: false, error: "The campaign plan has no current place." };

  if (!allowProgress) {
    if (clearedScene.value.length > 0) {
      return { ok: false, error: "Do not clear a scene objective before the check succeeds." };
    }
    if (requestedPlace.value.length > 0 && requestedPlace.value !== spot.id) {
      return { ok: false, error: "Do not change places before the check succeeds." };
    }
    if (requestedScene.value.length > 0 && requestedScene.value !== scene.id) {
      return { ok: false, error: "Do not change scenes before the check succeeds." };
    }
    const stayed = stayPlace(place, spot.name);
    if (!stayed.ok) return stayed;
    return { ok: true, value: { place: stayed.value, planUpdate: plan } };
  }

  const scenes = plan.scenes.map((entry) => ({
    ...entry,
    places: entry.places.map((node) => ({ ...node })),
  }));
  const current = scenes.find((entry) => entry.id === scene.id);
  if (!current) return { ok: false, error: "The campaign plan has no current scene." };

  if (clearedScene.value.length > 0) {
    if (clearedScene.value !== current.id) {
      return { ok: false, error: "Clear only the current scene objective." };
    }
    if (current.objectiveStatus === "cleared") {
      return { ok: false, error: "That scene objective is already cleared." };
    }
    if (spot.next !== "") {
      return { ok: false, error: "Clear a scene objective only from its last place." };
    }
    current.objectiveStatus = "cleared";
  }

  let destinationScene = current;
  if (requestedScene.value.length > 0 && requestedScene.value !== current.id) {
    if (requestedScene.value !== current.next) {
      return { ok: false, error: "sceneId must be empty, the current scene, or the next scene." };
    }
    if (current.objectiveStatus !== "cleared") {
      return { ok: false, error: "Do not enter the next scene until this scene's objective is cleared." };
    }
    const nextScene = scenes.find((entry) => entry.id === current.next);
    if (!nextScene) return { ok: false, error: "sceneId must be a scene id from the campaign plan." };
    destinationScene = nextScene;
  }

  const head = destinationScene.places[0];
  if (!head) return { ok: false, error: "The next scene has no place." };

  let destination = spot;
  if (destinationScene.id !== current.id) {
    if (requestedPlace.value.length > 0 && requestedPlace.value !== head.id) {
      return { ok: false, error: "When entering the next scene, placeId is empty or that scene's first place." };
    }
    destination = head;
  } else if (requestedPlace.value.length > 0 && requestedPlace.value !== spot.id) {
    if (requestedPlace.value !== spot.next) {
      return { ok: false, error: "placeId must be empty, the current place, or the next place in this scene." };
    }
    const nextPlace = current.places.find((entry) => entry.id === spot.next);
    if (!nextPlace) return { ok: false, error: "placeId must be a place id from the current scene." };
    destination = nextPlace;
  }

  const moved = destination.id !== spot.id || destinationScene.id !== scene.id;
  const planUpdate = {
    scenes,
    currentSceneId: destinationScene.id,
    currentPlaceId: destination.id,
  };
  if (!moved) {
    const stayed = stayPlace(place, spot.name);
    if (!stayed.ok) return stayed;
    return { ok: true, value: { place: stayed.value, planUpdate } };
  }
  return { ok: true, value: { place: destination.name, planUpdate } };
}

function parsePlanStructure(value: unknown): Parsed<{ scenes: PlanScene[] }> {
  if (!isRecord(value) || !Array.isArray(value.scenes)) {
    return { ok: false, error: "The plan must be an object with a scenes array." };
  }
  if (value.scenes.length === 0 || value.scenes.length > 8) {
    return { ok: false, error: "Return between 1 and 8 scenes." };
  }

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenObjectives = new Set<string>();
  const scenes: PlanScene[] = [];

  for (const entry of value.scenes) {
    const scene = readScene(entry, seenIds, seenNames);
    if (!scene.ok) return scene;
    const objectiveKey = scene.value.objective.toLowerCase();
    if (seenObjectives.has(objectiveKey)) return { ok: false, error: "Two scenes share an objective." };
    seenObjectives.add(objectiveKey);
    scenes.push(scene.value);
  }

  const orderedScenes = orderLinks(scenes, "scene");
  if (!orderedScenes.ok) return orderedScenes;

  const withPlaces: PlanScene[] = [];
  for (const scene of orderedScenes.value) {
    const places = orderLinks(scene.places, "place");
    if (!places.ok) {
      const reason = places.error.charAt(0).toLowerCase() + places.error.slice(1);
      return { ok: false, error: `In scene ${scene.id}, ${reason}` };
    }
    withPlaces.push({ ...scene, places: places.value });
  }

  return { ok: true, value: { scenes: withPlaces } };
}

function readScene(
  value: unknown,
  seenIds: Set<string>,
  seenNames: Set<string>,
): Parsed<PlanScene> {
  if (!isRecord(value) || !Array.isArray(value.places)) {
    return { ok: false, error: "Each scene needs id, name, summary, objective, next, and places." };
  }
  const id = readId(value.id, "Scene id");
  if (!id.ok) return id;
  if (seenIds.has(id.value)) return { ok: false, error: `Scene id ${id.value} is duplicated.` };
  seenIds.add(id.value);
  const name = readText(value.name, "Scene name", PLAN_NAME_MAX);
  if (!name.ok) return name;
  const nameKey = name.value.toLowerCase();
  if (seenNames.has(nameKey)) return { ok: false, error: "That name is already used." };
  seenNames.add(nameKey);
  const summary = readText(value.summary, "Scene summary", PLAN_SUMMARY_MAX);
  if (!summary.ok) return summary;
  const objective = readText(value.objective, "Scene objective", PLAN_OBJECTIVE_MAX);
  if (!objective.ok) return objective;
  const next = readLink(value.next, "Scene next");
  if (!next.ok) return next;
  if (value.places.length === 0 || value.places.length > 8) {
    return { ok: false, error: "Each scene needs between 1 and 8 places." };
  }

  const places: PlanPlace[] = [];
  for (const entry of value.places) {
    const place = readPlace(entry, seenIds, seenNames);
    if (!place.ok) return place;
    places.push(place.value);
  }
  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      summary: summary.value,
      objective: objective.value,
      next: next.value,
      places,
      objectiveStatus: "pending",
    },
  };
}

function readPlace(value: unknown, seenIds: Set<string>, seenNames: Set<string>): Parsed<PlanPlace> {
  if (!isRecord(value)) return { ok: false, error: "Each place needs id, name, summary, and next." };
  const id = readId(value.id, "Place id");
  if (!id.ok) return id;
  if (seenIds.has(id.value)) return { ok: false, error: `Place id ${id.value} is duplicated.` };
  seenIds.add(id.value);
  const name = readText(value.name, "Place name", PLAN_NAME_MAX);
  if (!name.ok) return name;
  const nameKey = name.value.toLowerCase();
  if (seenNames.has(nameKey)) return { ok: false, error: "That name is already used." };
  seenNames.add(nameKey);
  const summary = readText(value.summary, "Place summary", PLAN_SUMMARY_MAX);
  if (!summary.ok) return summary;
  const next = readLink(value.next, "Place next");
  if (!next.ok) return next;
  return { ok: true, value: { id: id.value, name: name.value, summary: summary.value, next: next.value } };
}

function orderLinks<T extends PlanLink>(nodes: T[], noun: string): Parsed<T[]> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const targeted = new Set<string>();
  let tails = 0;
  for (const node of nodes) {
    if (node.next === "") {
      tails += 1;
      continue;
    }
    if (node.next === node.id) return { ok: false, error: `${noun} ${node.id} cannot point at itself.` };
    if (!byId.has(node.next)) return { ok: false, error: `${noun} ${node.id} points at unknown id ${node.next}.` };
    if (targeted.has(node.next)) return { ok: false, error: `${noun} ${node.next} has two predecessors.` };
    targeted.add(node.next);
  }
  if (tails !== 1) {
    return { ok: false, error: `The ${noun} list needs exactly one last node, with an empty next.` };
  }
  const heads = nodes.filter((node) => !targeted.has(node.id));
  if (heads.length !== 1) return { ok: false, error: `The ${noun} list needs exactly one first node.` };

  const ordered: T[] = [];
  const seen = new Set<string>();
  let current: T | undefined = heads[0];
  while (current) {
    if (seen.has(current.id)) return { ok: false, error: `The ${noun} list contains a cycle.` };
    seen.add(current.id);
    ordered.push(current);
    current = current.next === "" ? undefined : byId.get(current.next);
  }
  if (ordered.length !== nodes.length) {
    return { ok: false, error: `Every ${noun} must be reachable from the first.` };
  }
  return { ok: true, value: ordered };
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

function readLink(value: unknown, label: string): Parsed<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string. Use an empty string on the last node.` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: "" };
  return readId(trimmed, label);
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

function readOptionalId(value: unknown, label: string): Parsed<string> {
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string. Use an empty string to stay.` };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: "" };
  if (!PLAN_ID.test(trimmed)) return { ok: false, error: `${label} must be empty or an id from the campaign plan.` };
  return { ok: true, value: trimmed };
}

function stayPlace(place: string, placeName: string): Parsed<string> {
  const trimmed = place.trim();
  if (trimmed.length === 0) return { ok: true, value: "" };
  if (trimmed.toLowerCase() === placeName.toLowerCase()) return { ok: true, value: placeName };
  return {
    ok: false,
    error: "Place must stay empty or match the current place. Set placeId to the next place to travel. Do not invent a place.",
  };
}

function sceneSource(value: unknown, id: string): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.scenes)) return null;
  for (const entry of value.scenes) {
    if (isRecord(entry) && typeof entry.id === "string" && entry.id.trim() === id) return entry;
  }
  return null;
}

function isObjectiveStatus(value: unknown): value is PlanObjectiveStatus {
  return OBJECTIVE_STATUSES.some((status) => status === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
