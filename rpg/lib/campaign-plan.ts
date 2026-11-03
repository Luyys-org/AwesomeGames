import type { CampaignSettings, EnemyDifficultyId } from "@/rpg/lib/campaign-settings";
import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import type { ItemModifier, StatDefinition } from "@/rpg/lib/character-options";

export const PLAN_ID_MAX = 24;
export const PLAN_NAME_MAX = 40;
export const PLAN_SUMMARY_MAX = 400;
export const PLAN_OBJECTIVE_MAX = 280;
export const PLAN_NARRATION_MAX = 400;
export const PLAN_LINE_MAX = 200;
export const PLAN_ACTION_MIN = 2;
export const PLAN_ACTION_MAX = 4;
export const PLAN_ENCOUNTER_MAX = 2;

const PLAN_ACTION_ID = /^[a-z][a-z0-9-]{0,31}$/;
const PLAN_EFFECTS = ["stay", "next-place", "clear-scene", "encounter"] as const;
const PLAN_FAILURES = ["setback", "harm", "severe"] as const;
const PLAN_DIFFICULTIES = [8, 10, 12, 15] as const;

export type PlanActionEffect = (typeof PLAN_EFFECTS)[number];
export type PlanCheckFailure = (typeof PLAN_FAILURES)[number];

export interface PlanLootItem {
  name: string;
  slot: string;
  equipped: boolean;
  modifiers: ItemModifier[];
}

export interface PlanAction {
  id: string;
  label: string;
  stat: string;
  difficulty: (typeof PLAN_DIFFICULTIES)[number];
  failure: PlanCheckFailure;
  abilityId: string;
  effect: PlanActionEffect;
  encounterId: string;
  certain: boolean;
  setup: string;
  success: string;
  miss: string;
}

export interface PlanEncounter {
  id: string;
  name: string;
  summary: string;
  triggerActionId: string;
  defeat: { xp: number; currency: number; items: PlanLootItem[] };
  malus: { wounds: 0 | 1 | 2; consequence: string };
  resolved: boolean;
}

export interface PlanSceneReward {
  characterId: string;
  xp: number;
  currency: number;
  items: PlanLootItem[];
}

const PLAN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OBJECTIVE_STATUSES = ["pending", "cleared"] as const;

export type PlanObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export interface PlanPlace {
  id: string;
  name: string;
  summary: string;
  next: string;
  narration: string;
  actions: PlanAction[];
  encounters: PlanEncounter[];
}

export interface PlanScene {
  id: string;
  name: string;
  summary: string;
  objective: string;
  next: string;
  places: PlanPlace[];
  objectiveStatus: PlanObjectiveStatus;
  narration: string;
  success: string;
  failure: string;
  rewards: PlanSceneReward[];
}

export interface CampaignPlan {
  scenes: PlanScene[];
  currentSceneId: string;
  currentPlaceId: string;
  /** False on saves written before the room script. Those keep the free game master. */
  scripted: boolean;
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
  narration: number;
  line: number;
}

export interface PlanStartPlace {
  id: string;
  name: string;
  summary: string;
  narration: string;
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

const SCRIPTED_RULES = `The room and the scene are already decided. Narrate only the outcome in the user message. Do not add a foe, a reward, a place, or a new problem. Do not choose the next action.`;

const NO_PLAN_RULES =
  "No campaign plan is stored. Return placeId, sceneId, and clearedSceneId as empty strings.";

const LOADOUT_NOTE = `The campaign plan is the map. The party is in currentPlaceId of currentSceneId. The first actions pursue that scene's objective, or travel along next toward the last place of this scene. Do not offer an action that enters the next scene while mayAdvanceScene is false, or that finishes the principal quest while mayFinishObjective is false.`;

const SCRIPTED_LOADOUT_NOTE = `The campaign plan already chose the actions for the current room. Do not invent actions. Write starting gear only.`;

export function planBounds(difficulty: EnemyDifficultyId): PlanBounds {
  return {
    ...BOUNDS[difficulty],
    id: PLAN_ID_MAX,
    name: PLAN_NAME_MAX,
    summary: PLAN_SUMMARY_MAX,
    objective: PLAN_OBJECTIVE_MAX,
    narration: PLAN_NARRATION_MAX,
    line: PLAN_LINE_MAX,
  };
}

/** Player-facing opening for the lobby, taken from the first scene and the first room. */
export function openingSituationFromPlan(plan: CampaignPlan): string {
  const scene = plan.scenes[0];
  const place = scene?.places[0];
  if (!scene || !place) return "";
  const sceneText = scene.narration.trim();
  const placeText = (place.narration || place.summary).trim();
  if (sceneText && placeText && sceneText !== placeText) return `${sceneText} ${placeText}`.slice(0, 800);
  return (placeText || sceneText || place.summary).slice(0, 800);
}

export function planStartPlace(plan: CampaignPlan): PlanStartPlace | null {
  const scene = plan.scenes[0];
  const place = scene?.places[0];
  if (!scene || !place) return null;
  return {
    id: place.id,
    name: place.name,
    summary: place.summary,
    narration: place.narration,
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
  const nextPlaceName = scriptedNextPlaceName(plan);
  return {
    scripted: plan.scripted,
    currentSceneId: plan.currentSceneId,
    currentPlaceId: plan.currentPlaceId,
    currentObjective: scene?.objective ?? "",
    mayAdvanceScene: Boolean(scene && scene.next !== "" && scene.objectiveStatus === "cleared"),
    mayFinishObjective: Boolean(scene && onLastScene && onLastPlace && scene.objectiveStatus === "cleared"),
    ...(plan.scripted
      ? {
          sceneNarration: scene?.narration ?? "",
          sceneSuccess: scene?.success ?? "",
          sceneFailure: scene?.failure ?? "",
          placeNarration: place?.narration ?? "",
          nextPlaceName,
        }
      : {}),
    scenes: plan.scripted
      ? []
      : plan.scenes.map((entry) => ({
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
  if (!plan) return NO_PLAN_RULES;
  return plan.scripted ? SCRIPTED_RULES : TURN_RULES;
}

export function planNoteForLoadout(plan: CampaignPlan | null): string {
  if (!plan) return "";
  return plan.scripted ? SCRIPTED_LOADOUT_NOTE : LOADOUT_NOTE;
}

export function isScriptedPlan(plan: CampaignPlan | null): plan is CampaignPlan {
  return plan?.scripted === true;
}

/** How many rooms may hold an encounter for this frequency. */
export function encounterPlaceBounds(placeCount: number, frequency: SettingLevel): { min: number; max: number } {
  if (placeCount <= 0) return { min: 0, max: 0 };
  if (frequency === "low") return { min: 0, max: Math.max(1, Math.ceil(placeCount / 3)) };
  if (frequency === "high") {
    const min = Math.max(1, Math.ceil((placeCount * 2) / 3));
    return { min, max: placeCount };
  }
  const min = placeCount >= 3 ? 1 : 0;
  const max = Math.max(min, Math.ceil(placeCount / 2));
  return { min, max };
}

export function currentPlanNodes(plan: CampaignPlan): { scene: PlanScene; place: PlanPlace } | null {
  const scene = plan.scenes.find((entry) => entry.id === plan.currentSceneId);
  const place = scene?.places.find((entry) => entry.id === plan.currentPlaceId);
  if (!scene || !place) return null;
  return { scene, place };
}

/** Actions the party can take in the current room, hiding spent encounters and locked doors. */
export function offeredPlanActions(plan: CampaignPlan): PlanAction[] {
  const nodes = currentPlanNodes(plan);
  if (!nodes) return [];
  const { scene, place } = nodes;
  const resolved = new Set(place.encounters.filter((encounter) => encounter.resolved).map((encounter) => encounter.id));
  return place.actions.filter((action) => {
    if (action.effect === "encounter" && resolved.has(action.encounterId)) return false;
    if (action.effect === "clear-scene" && scene.objectiveStatus === "cleared") return false;
    if (action.effect === "next-place" && place.next === "" && scene.objectiveStatus !== "cleared") return false;
    return true;
  });
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
  const script = validateScript(scenes, settings, true);
  if (!script.ok) return script;
  return {
    ok: true,
    value: {
      scenes: script.value.map((scene) => ({ ...scene, objectiveStatus: "pending", rewards: [] })),
      currentSceneId: first.id,
      currentPlaceId: start.id,
      scripted: true,
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
  const scripted = scenes.some((scene) => scene.narration.length > 0 || scene.places.some((place) => place.actions.length > 0));
  if (scripted) {
    const script = validateScript(scenes, null, true);
    if (!script.ok) return script;
    return { ok: true, value: { scenes: script.value, currentSceneId, currentPlaceId, scripted: true } };
  }
  return {
    ok: true,
    value: {
      scenes: scenes.map(blankScript),
      currentSceneId,
      currentPlaceId,
      scripted: false,
    },
  };
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
    scripted: plan.scripted,
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
  const narration = readOptionalLine(value.narration, "Scene narration", PLAN_NARRATION_MAX);
  if (!narration.ok) return narration;
  const success = readOptionalLine(value.success, "Scene success", PLAN_LINE_MAX);
  if (!success.ok) return success;
  const failure = readOptionalLine(value.failure, "Scene failure", PLAN_LINE_MAX);
  if (!failure.ok) return failure;
  const rewards = readRewards(value.rewards);
  if (!rewards.ok) return rewards;

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
      narration: narration.value,
      success: success.value,
      failure: failure.value,
      rewards: rewards.value,
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
  const narration = readOptionalLine(value.narration, "Place narration", PLAN_NARRATION_MAX);
  if (!narration.ok) return narration;
  const actions = readActions(value.actions);
  if (!actions.ok) return actions;
  const encounters = readEncounters(value.encounters);
  if (!encounters.ok) return encounters;
  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      summary: summary.value,
      next: next.value,
      narration: narration.value,
      actions: actions.value,
      encounters: encounters.value,
    },
  };
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

function scriptedNextPlaceName(plan: CampaignPlan): string {
  const nodes = currentPlanNodes(plan);
  if (!nodes) return "";
  const { scene, place } = nodes;
  if (place.next !== "") {
    return scene.places.find((entry) => entry.id === place.next)?.name ?? "";
  }
  if (scene.next === "" || scene.objectiveStatus !== "cleared") return "";
  const nextScene = plan.scenes.find((entry) => entry.id === scene.next);
  return nextScene?.places[0]?.name ?? "";
}

function blankScript(scene: PlanScene): PlanScene {
  return {
    ...scene,
    narration: "",
    success: "",
    failure: "",
    rewards: [],
    places: scene.places.map((place) => ({ ...place, narration: "", actions: [], encounters: [] })),
  };
}

function validateScript(
  scenes: PlanScene[],
  settings: CampaignSettings | null,
  required: boolean,
): Parsed<PlanScene[]> {
  const stats = settings?.characterOptions?.stats ?? [];
  const skills = settings?.characterOptions?.skills ?? [];
  const caps = settings ? lootCaps(settings) : { currencyMax: 100, itemMax: 3 };
  const actionIds = new Set<string>();
  let roomsWithEncounters = 0;
  let roomCount = 0;

  for (const scene of scenes) {
    if (required && (scene.narration.length === 0 || scene.success.length === 0 || scene.failure.length === 0)) {
      return { ok: false, error: `Scene ${scene.id} needs narration, success, and failure.` };
    }
    const last = scene.places[scene.places.length - 1];
    for (const place of scene.places) {
      roomCount += 1;
      if (required && place.narration.length === 0) {
        return { ok: false, error: `Place ${place.id} needs narration.` };
      }
      if (place.actions.length < PLAN_ACTION_MIN || place.actions.length > PLAN_ACTION_MAX) {
        if (place.actions.length === 0 && !required) continue;
        return {
          ok: false,
          error: `Place ${place.id} needs ${PLAN_ACTION_MIN} to ${PLAN_ACTION_MAX} actions.`,
        };
      }
      if (place.encounters.length > PLAN_ENCOUNTER_MAX) {
        return { ok: false, error: `Place ${place.id} can have at most ${PLAN_ENCOUNTER_MAX} encounters.` };
      }
      if (place.encounters.length > 0) roomsWithEncounters += 1;
      for (const action of place.actions) {
        if (actionIds.has(action.id)) return { ok: false, error: `Action id ${action.id} is duplicated.` };
        actionIds.add(action.id);
        if (stats.length > 0 && !stats.some((stat) => stat.id === action.stat)) {
          return { ok: false, error: `Action ${action.id} uses an unknown stat.` };
        }
        if (action.abilityId && skills.length > 0) {
          const skill = skills.find((entry) => entry.id === action.abilityId);
          if (!skill) return { ok: false, error: `Action ${action.id} uses an unknown abilityId.` };
          if (skill.statId !== action.stat) {
            return { ok: false, error: `Action ${action.id} abilityId must match the action stat.` };
          }
        }
        const effectError = checkActionEffect(scene, place, last?.id ?? "", action);
        if (effectError) return { ok: false, error: effectError };
      }
      for (const encounter of place.encounters) {
        const trigger = place.actions.find((action) => action.id === encounter.triggerActionId);
        if (!trigger || trigger.effect !== "encounter" || trigger.encounterId !== encounter.id) {
          return {
            ok: false,
            error: `Encounter ${encounter.id} must be triggered by an encounter action in ${place.id}.`,
          };
        }
        if (encounter.defeat.currency > caps.currencyMax || encounter.defeat.items.length > caps.itemMax) {
          return { ok: false, error: `Encounter ${encounter.id} defeat loot is outside the campaign limits.` };
        }
      }
      if (place.next === "" && !place.actions.some((action) => action.effect === "clear-scene")) {
        return { ok: false, error: `The last place ${place.id} needs a clear-scene action.` };
      }
      if (place.next !== "" && !place.actions.some((action) => action.effect === "next-place")) {
        return { ok: false, error: `Place ${place.id} needs a next-place action.` };
      }
      if (place.next === "" && scene.next !== "" && !place.actions.some((action) => action.effect === "next-place")) {
        return { ok: false, error: `Place ${place.id} needs a next-place action into the next scene.` };
      }
    }
  }

  if (required && settings?.campaignConfiguration) {
    const bounds = encounterPlaceBounds(roomCount, settings.campaignConfiguration.encounterFrequency);
    if (roomsWithEncounters < bounds.min || roomsWithEncounters > bounds.max) {
      return {
        ok: false,
        error: `This encounter frequency needs encounters in ${bounds.min} to ${bounds.max} rooms.`,
      };
    }
  }

  return { ok: true, value: scenes };
}

function checkActionEffect(scene: PlanScene, place: PlanPlace, lastId: string, action: PlanAction): string | null {
  if (action.effect === "clear-scene" && place.id !== lastId) {
    return `Action ${action.id} can clear the scene only from its last place.`;
  }
  if (action.effect === "next-place" && place.next === "" && scene.next === "") {
    return `Action ${action.id} has nowhere to go next.`;
  }
  if (action.effect === "encounter") {
    if (action.certain) return `Action ${action.id} cannot be certain and start an encounter.`;
    if (!place.encounters.some((encounter) => encounter.id === action.encounterId)) {
      return `Action ${action.id} must name an encounter in ${place.id}.`;
    }
  } else if (action.encounterId !== "") {
    return `Action ${action.id} must leave encounterId empty.`;
  }
  return null;
}

function readOptionalLine(value: unknown, label: string, max: number): Parsed<string> {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  return readText(value, label, max);
}

function readActions(value: unknown): Parsed<PlanAction[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Place actions must be an array." };
  const actions: PlanAction[] = [];
  for (const entry of value) {
    const action = readAction(entry);
    if (!action.ok) return action;
    actions.push(action.value);
  }
  return { ok: true, value: actions };
}

function readAction(value: unknown): Parsed<PlanAction> {
  if (!isRecord(value)) return { ok: false, error: "Each action needs id, label, stat, difficulty, and failure." };
  if (typeof value.id !== "string" || !PLAN_ACTION_ID.test(value.id.trim())) {
    return { ok: false, error: "Each action id must be a lowercase slug of at most 32 characters." };
  }
  const label = readText(value.label, "Action label", 72);
  if (!label.ok) return label;
  if (typeof value.stat !== "string" || !PLAN_ID.test(value.stat.trim())) {
    return { ok: false, error: "Each action stat must be a campaign stat id." };
  }
  if (!PLAN_DIFFICULTIES.some((difficulty) => difficulty === value.difficulty)) {
    return { ok: false, error: "Action difficulty must be 8, 10, 12, or 15." };
  }
  if (!PLAN_FAILURES.some((failure) => failure === value.failure)) {
    return { ok: false, error: "Action failure must be setback, harm, or severe." };
  }
  if (!PLAN_EFFECTS.some((effect) => effect === value.effect)) {
    return { ok: false, error: "Action effect must be stay, next-place, clear-scene, or encounter." };
  }
  const ability = readOptionalId(value.abilityId ?? "", "abilityId");
  if (!ability.ok) return ability;
  const encounterId = readOptionalId(value.encounterId ?? "", "encounterId");
  if (!encounterId.ok) return encounterId;
  if (typeof value.certain !== "boolean") return { ok: false, error: "Each action needs certain true or false." };
  const setup = readText(value.setup, "Action setup", PLAN_LINE_MAX);
  if (!setup.ok) return setup;
  const success = readText(value.success, "Action success", PLAN_LINE_MAX);
  if (!success.ok) return success;
  const miss = readText(value.miss, "Action miss", PLAN_LINE_MAX);
  if (!miss.ok) return miss;
  return {
    ok: true,
    value: {
      id: value.id.trim(),
      label: label.value,
      stat: value.stat.trim(),
      difficulty: value.difficulty as PlanAction["difficulty"],
      failure: value.failure as PlanCheckFailure,
      abilityId: ability.value,
      effect: value.effect as PlanActionEffect,
      encounterId: encounterId.value,
      certain: value.certain,
      setup: setup.value,
      success: success.value,
      miss: miss.value,
    },
  };
}

function readEncounters(value: unknown): Parsed<PlanEncounter[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Place encounters must be an array." };
  const encounters: PlanEncounter[] = [];
  for (const entry of value) {
    const encounter = readEncounter(entry);
    if (!encounter.ok) return encounter;
    encounters.push(encounter.value);
  }
  return { ok: true, value: encounters };
}

function readEncounter(value: unknown): Parsed<PlanEncounter> {
  if (!isRecord(value)) return { ok: false, error: "Each encounter needs id, name, summary, and a trigger." };
  const id = readId(value.id, "Encounter id");
  if (!id.ok) return id;
  const name = readText(value.name, "Encounter name", 48);
  if (!name.ok) return name;
  const summary = readText(value.summary, "Encounter summary", 200);
  if (!summary.ok) return summary;
  if (typeof value.triggerActionId !== "string" || !PLAN_ACTION_ID.test(value.triggerActionId.trim())) {
    return { ok: false, error: "Each encounter needs a triggerActionId." };
  }
  if (!isRecord(value.defeat) || !isRecord(value.malus)) {
    return { ok: false, error: "Each encounter needs defeat loot and a failure malus." };
  }
  const xp = value.defeat.xp;
  if (typeof xp !== "number" || !Number.isInteger(xp) || xp < 10 || xp > 100) {
    return { ok: false, error: "Encounter experience must be a whole number from 10 to 100." };
  }
  const currency = value.defeat.currency;
  if (typeof currency !== "number" || !Number.isInteger(currency) || currency < 0) {
    return { ok: false, error: "Encounter currency must be a whole number from 0." };
  }
  const items = readLootItems(value.defeat.items);
  if (!items.ok) return items;
  const wounds = value.malus.wounds;
  if (wounds !== 0 && wounds !== 1 && wounds !== 2) {
    return { ok: false, error: "Encounter malus wounds must be 0, 1, or 2." };
  }
  const consequence = readText(value.malus.consequence, "Encounter malus", PLAN_LINE_MAX);
  if (!consequence.ok) return consequence;
  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      summary: summary.value,
      triggerActionId: value.triggerActionId.trim(),
      defeat: { xp, currency, items: items.value },
      malus: { wounds, consequence: consequence.value },
      resolved: value.resolved === true,
    },
  };
}

function readRewards(value: unknown): Parsed<PlanSceneReward[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Scene rewards must be an array." };
  const rewards: PlanSceneReward[] = [];
  for (const entry of value) {
    const reward = readReward(entry);
    if (!reward.ok) return reward;
    rewards.push(reward.value);
  }
  return { ok: true, value: rewards };
}

function readReward(value: unknown): Parsed<PlanSceneReward> {
  if (!isRecord(value) || typeof value.characterId !== "string" || value.characterId.trim().length === 0) {
    return { ok: false, error: "Each scene reward needs a characterId." };
  }
  if (typeof value.xp !== "number" || !Number.isInteger(value.xp) || value.xp < 10 || value.xp > 100) {
    return { ok: false, error: "Scene reward experience must be a whole number from 10 to 100." };
  }
  if (typeof value.currency !== "number" || !Number.isInteger(value.currency) || value.currency < 0) {
    return { ok: false, error: "Scene reward currency must be a whole number from 0." };
  }
  const items = readLootItems(value.items);
  if (!items.ok) return items;
  return {
    ok: true,
    value: { characterId: value.characterId.trim(), xp: value.xp, currency: value.currency, items: items.value },
  };
}

function readLootItems(value: unknown): Parsed<PlanLootItem[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Loot items must be an array." };
  const items: PlanLootItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      return { ok: false, error: "Each loot item needs a name." };
    }
    const name = entry.name.trim();
    if (name.length === 0 || name.length > 80) {
      return { ok: false, error: "Each loot item name must be 1 to 80 characters." };
    }
    const modifiers = readPlanModifiers(entry.modifiers);
    if (!modifiers.ok) return modifiers;
    const slot = typeof entry.slot === "string" ? entry.slot.trim() : null;
    if (slot === null || (slot.length > 0 && !/^[a-z][a-z0-9-]{0,23}$/.test(slot))) {
      return { ok: false, error: "Each loot item slot must be empty or a lowercase slug." };
    }
    items.push({ name, slot, equipped: entry.equipped === true, modifiers: modifiers.value });
  }
  return { ok: true, value: items };
}

function readPlanModifiers(value: unknown): Parsed<ItemModifier[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Item modifiers must be an array." };
  const modifiers: ItemModifier[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || (entry.kind !== "stat" && entry.kind !== "roll")) {
      return { ok: false, error: "Item modifier kind must be stat or roll." };
    }
    if (typeof entry.statId !== "string") return { ok: false, error: "Each item modifier needs a statId." };
    if (typeof entry.amount !== "number" || !Number.isInteger(entry.amount) || entry.amount === 0) {
      return { ok: false, error: "Item modifier amount must be a non-zero integer from -3 to 3." };
    }
    if (entry.amount < -3 || entry.amount > 3) {
      return { ok: false, error: "Item modifier amount must be from -3 to 3." };
    }
    modifiers.push({ kind: entry.kind, statId: entry.statId, amount: entry.amount });
  }
  return { ok: true, value: modifiers };
}

export function assignSceneRewards(
  plan: CampaignPlan,
  incoming: unknown,
  characterIds: string[],
  stats: StatDefinition[],
  limits: { currencyMax: number; itemMax: number },
): Parsed<CampaignPlan> {
  if (!plan.scripted) return { ok: false, error: "Scene rewards belong on a scripted plan." };
  if (!isRecord(incoming) || !Array.isArray(incoming.scenes)) {
    return { ok: false, error: "Scene rewards must list every scene." };
  }
  if (incoming.scenes.length !== plan.scenes.length) {
    return { ok: false, error: "Scene rewards must list every scene once." };
  }
  const byId = new Map<string, PlanSceneReward[]>();
  for (const entry of incoming.scenes) {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      return { ok: false, error: "Each scene reward block needs an id." };
    }
    if (!plan.scenes.some((scene) => scene.id === entry.id)) {
      return { ok: false, error: `Scene ${entry.id} is not on the campaign plan.` };
    }
    if (byId.has(entry.id)) return { ok: false, error: `Scene ${entry.id} is listed twice.` };
    const rewards = readRewards(entry.rewards);
    if (!rewards.ok) return rewards;
    const seen = new Set<string>();
    for (const reward of rewards.value) {
      if (!characterIds.includes(reward.characterId)) {
        return { ok: false, error: "Scene rewards can name only living characters." };
      }
      if (seen.has(reward.characterId)) {
        return { ok: false, error: "Each character can receive one scene reward." };
      }
      seen.add(reward.characterId);
      if (reward.currency > limits.currencyMax || reward.items.length > limits.itemMax) {
        return { ok: false, error: "Scene reward loot is outside the campaign limits." };
      }
      for (const item of reward.items) {
        for (const modifier of item.modifiers) {
          if (modifier.kind === "stat" && !stats.some((stat) => stat.id === modifier.statId)) {
            return { ok: false, error: "Scene reward modifiers must use campaign stat ids." };
          }
        }
      }
    }
    if (characterIds.some((id) => !seen.has(id))) {
      return { ok: false, error: "Each living character needs a reward in every scene." };
    }
    byId.set(entry.id, rewards.value);
  }
  return {
    ok: true,
    value: {
      ...plan,
      scenes: plan.scenes.map((scene) => ({ ...scene, rewards: byId.get(scene.id) ?? [] })),
    },
  };
}

function lootCaps(settings: CampaignSettings): { currencyMax: number; itemMax: number } {
  const fallback: SettingLevel =
    settings.lootRarity === "scarce" ? "low" : settings.lootRarity === "abundant" ? "high" : "standard";
  const currency = settings.campaignConfiguration?.currencyAbundance ?? fallback;
  const items = settings.campaignConfiguration?.lootQuantity ?? fallback;
  const currencyMax = currency === "low" ? 12 : currency === "high" ? 100 : 40;
  const itemMax = items === "low" ? 1 : items === "high" ? 3 : 2;
  return { currencyMax, itemMax };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
