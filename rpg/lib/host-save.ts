import {
  characterOptionsFor,
  coreCharacterOptions,
  parseCharacterOptions,
  parseItemModifiers,
  parseItemSlot,
  parseStatBlock,
  type CharacterOptions,
  type StatDefinition,
} from "@/rpg/lib/character-options";
import { storedRacePicks, type InventoryItem, type TableCharacter, type Wound } from "@/rpg/lib/character";
import { readStoredCharacterSituation } from "@/rpg/lib/character-situation";
import {
  DEATH_PENALTIES,
  ENEMY_DIFFICULTIES,
  LOOT_RARITIES,
  PLAYER_COUNTS,
  PLAYER_FREEDOMS,
  UNIVERSES,
  UNIVERSE_TYPES,
  type CampaignSettings,
  type DeathPenaltyId,
  type EnemyDifficultyId,
  type LootRarityId,
  type PlayerFreedomId,
  type UniverseId,
  type UniverseTypeId,
} from "@/rpg/lib/campaign-settings";
import { parseStoredCampaignConfiguration } from "@/rpg/lib/campaign-tab-config";
import { parseStoredCharacterConfiguration } from "@/rpg/lib/character-tab-config";
import { parseStoredPlan, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import { emptyJourney, parseJourney, type JourneyGraph } from "@/rpg/lib/journey";
import { createRoomCode, isClaimCode } from "@/rpg/lib/room-code";
import { parseSceneActions } from "@/rpg/lib/scene-action";
import { writeHostSession } from "@/rpg/lib/host-session";
import {
  defaultSceneImageState,
  emptyLocation,
  type SceneAction,
  type SceneLocation,
  type TableState,
  type TranscriptEntry,
} from "@/rpg/lib/table";

export const HOST_SAVE_STORAGE_KEY = "rpg.host.save";

const SAVE_TEXT_MAX = 256_000;
const INVALID_SAVE = "This save is not valid.";
const NAME_PATTERN = /^[A-Za-z0-9 '\-]+$/;
const CHARACTER_ID_PATTERN = /^pc_[0-9a-f]{8}$/;
const ITEM_ID_PATTERN = /^itm_[0-9a-f]{8}$/;
const WOUND_PREFIXES: readonly Wound[][] = [
  [],
  ["hurt"],
  ["hurt", "impaired"],
  ["hurt", "impaired", "down"],
];

interface CampaignSavePayload {
  phase: "lobby" | "play";
  settings: CampaignSettings;
  objectiveStatus: TableState["objectiveStatus"];
  scene: number;
  situation: string;
  revision: number;
  characters: TableCharacter[];
  location: SceneLocation;
  transcript: TranscriptEntry[];
  availableActions: SceneAction[];
  loadoutReady: boolean;
  journey: JourneyGraph;
  campaignPlan: CampaignPlan | null;
  gmTurnCount: number;
  lastImageGmTurn: number;
  sceneImageId: string | null;
  sceneImageRevision: number;
}

type ParsedSave = { ok: true; value: CampaignSavePayload } | { ok: false; error: string };
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChoice<T extends string>(value: unknown, options: { id: T }[]): value is T {
  return options.some((entry) => entry.id === value);
}

function readInteger(value: unknown, min: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) return null;
  return value;
}

function readLine(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.includes("\n") || value.includes("\r")) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function readMultiline(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function readOptionalNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return fallback;
  return value;
}

function readOptionalImageGmTurn(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < -1) return fallback;
  return value;
}

function readOptionalSceneImageId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^img_[0-9a-f]{8}$/.test(trimmed)) return null;
  return trimmed;
}

function sceneImageFieldsFromSave(value: Record<string, unknown>): {
  gmTurnCount: number;
  lastImageGmTurn: number;
  sceneImageId: string | null;
  sceneImageRevision: number;
} {
  const defaults = defaultSceneImageState();
  return {
    gmTurnCount: readOptionalNonNegativeInt(value.gmTurnCount, defaults.gmTurnCount ?? 0),
    lastImageGmTurn: readOptionalImageGmTurn(value.lastImageGmTurn, defaults.lastImageGmTurn ?? -1),
    sceneImageId: readOptionalSceneImageId(value.sceneImageId) ?? defaults.sceneImageId ?? null,
    sceneImageRevision: readOptionalNonNegativeInt(
      value.sceneImageRevision,
      defaults.sceneImageRevision ?? 0,
    ),
  };
}

function isWoundPrefix(value: unknown): value is Wound[] {
  if (!Array.isArray(value)) return false;
  return WOUND_PREFIXES.some(
    (prefix) => prefix.length === value.length && prefix.every((wound, index) => wound === value[index]),
  );
}

function readCharacter(
  value: unknown,
  names: Set<string>,
  ids: Set<string>,
  claimCodes: Set<string>,
  options: CharacterOptions,
  requireTraits: boolean,
): TableCharacter | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !CHARACTER_ID_PATTERN.test(value.id) || ids.has(value.id)) {
    return null;
  }
  const name = readLine(value.name, 24);
  if (!name || !NAME_PATTERN.test(name) || names.has(name.toLowerCase())) return null;
  if (typeof value.abilityId !== "string" || !options.skills.some((entry) => entry.id === value.abilityId)) {
    return null;
  }
  if (!isWoundPrefix(value.wounds)) return null;
  if (typeof value.claimCode !== "string" || !isClaimCode(value.claimCode) || claimCodes.has(value.claimCode)) {
    return null;
  }
  if (value.owner !== "host" && value.owner !== "peer") return null;
  if (value.archived !== false || typeof value.inScene !== "boolean") return null;

  const classId = readTraitId(value.classId, options.classes, requireTraits);
  const stats = parseStatBlock(value.stats, options, classId ?? "");
  if (!stats || classId === null) return null;
  const raceId = readTraitId(value.raceId, options.races, requireTraits);
  if (raceId === null) return null;
  const picks = storedRacePicks(options, raceId, value.abilityId, value.extraAbilityId, value.raceStatIds);
  if (!picks.ok) return null;

  const down = value.wounds[value.wounds.length - 1] === "down";
  if (!value.inScene && value.wounds.length > 0 && !down) return null;

  ids.add(value.id);
  names.add(name.toLowerCase());
  claimCodes.add(value.claimCode);

  return {
    id: value.id,
    name,
    abilityId: value.abilityId,
    extraAbilityId: picks.extraAbilityId,
    classId,
    raceId,
    raceStatIds: picks.raceStatIds,
    stats,
    wounds: value.wounds,
    situation: readStoredCharacterSituation(value.situation),
    claimCode: value.claimCode,
    owner: value.owner,
    archived: false,
    inScene: value.inScene,
    ready: value.ready === true,
    currency: typeof value.currency === "number" && Number.isFinite(value.currency) && value.currency >= 0
      ? Math.floor(value.currency)
      : 0,
    inventory: [],
    level: typeof value.level === "number" && Number.isInteger(value.level) && value.level > 0 ? value.level : 1,
    xp: typeof value.xp === "number" && Number.isFinite(value.xp) && value.xp >= 0 ? Math.min(1000, Math.floor(value.xp)) : 0,
    pendingRewards:
      typeof value.pendingRewards === "number" && Number.isInteger(value.pendingRewards) && value.pendingRewards > 0
        ? value.pendingRewards
        : 0,
  };
}

function readTraitId(value: unknown, traits: { id: string }[], required: boolean): string | null {
  if (typeof value !== "string" || value === "") return required ? null : "";
  if (!traits.some((entry) => entry.id === value)) return null;
  return value;
}

function readInventory(value: unknown, stats: StatDefinition[]): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  const items: InventoryItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !ITEM_ID_PATTERN.test(entry.id)) continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (name.length === 0 || name.length > 80) continue;
    items.push({
      id: entry.id,
      name,
      slot: parseItemSlot(entry.slot),
      equipped: entry.equipped === true,
      modifiers: parseItemModifiers(entry.modifiers, stats),
    });
  }
  return items;
}

function readPlayCharacter(
  value: unknown,
  names: Set<string>,
  ids: Set<string>,
  claimCodes: Set<string>,
  options: CharacterOptions,
  requireTraits: boolean,
): TableCharacter | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !CHARACTER_ID_PATTERN.test(value.id) || ids.has(value.id)) {
    return null;
  }
  const name = readLine(value.name, 24);
  if (!name || !NAME_PATTERN.test(name) || names.has(name.toLowerCase())) return null;
  if (typeof value.abilityId !== "string" || !options.skills.some((entry) => entry.id === value.abilityId)) {
    return null;
  }
  if (!isWoundPrefix(value.wounds)) return null;
  if (typeof value.claimCode !== "string" || !isClaimCode(value.claimCode) || claimCodes.has(value.claimCode)) {
    return null;
  }
  if (value.owner !== "host" && value.owner !== "peer") return null;
  if (value.archived !== true && value.archived !== false) return null;
  if (typeof value.inScene !== "boolean") return null;

  const classId = readTraitId(value.classId, options.classes, requireTraits);
  const stats = parseStatBlock(value.stats, options, classId ?? "");
  if (!stats || classId === null) return null;
  const raceId = readTraitId(value.raceId, options.races, requireTraits);
  if (raceId === null) return null;
  const picks = storedRacePicks(options, raceId, value.abilityId, value.extraAbilityId, value.raceStatIds);
  if (!picks.ok) return null;

  const down = value.wounds[value.wounds.length - 1] === "down";
  if (!value.archived && !value.inScene && value.wounds.length > 0 && !down) return null;

  ids.add(value.id);
  names.add(name.toLowerCase());
  claimCodes.add(value.claimCode);

  return {
    id: value.id,
    name,
    abilityId: value.abilityId,
    extraAbilityId: picks.extraAbilityId,
    classId,
    raceId,
    raceStatIds: picks.raceStatIds,
    stats,
    wounds: value.wounds,
    situation: readStoredCharacterSituation(value.situation),
    claimCode: value.claimCode,
    owner: value.owner,
    archived: value.archived,
    inScene: value.inScene,
    ready: value.ready === true,
    currency:
      typeof value.currency === "number" && Number.isFinite(value.currency) && value.currency >= 0
        ? Math.floor(value.currency)
        : 0,
    inventory: readInventory(value.inventory, options.stats),
    level: typeof value.level === "number" && Number.isInteger(value.level) && value.level > 0 ? value.level : 1,
    xp: typeof value.xp === "number" && Number.isFinite(value.xp) && value.xp >= 0 ? Math.min(1000, Math.floor(value.xp)) : 0,
    pendingRewards:
      typeof value.pendingRewards === "number" &&
      Number.isInteger(value.pendingRewards) &&
      value.pendingRewards > 0
        ? value.pendingRewards
        : 0,
  };
}

function readSavePlan(value: unknown): Parsed<CampaignPlan | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  const parsed = parseStoredPlan(value);
  if (!parsed.ok) return { ok: false, error: INVALID_SAVE };
  return { ok: true, value: parsed.value };
}

function readLocation(value: unknown): SceneLocation {
  if (!isRecord(value)) return emptyLocation();
  const readLine80 = (entry: unknown) => {
    if (typeof entry !== "string") return "";
    const trimmed = entry.trim();
    return trimmed.length <= 80 ? trimmed : trimmed.slice(0, 80);
  };
  return {
    place: readLine80(value.place),
    weather: readLine80(value.weather),
    reputation: readLine80(value.reputation),
  };
}

function emptyList(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function readCampaignHeader(value: Record<string, unknown>): Parsed<{
  settings: CampaignSettings;
  objectiveStatus: TableState["objectiveStatus"];
  scene: number;
  situation: string;
  revision: number;
  characterOptions: CharacterOptions;
  requireTraits: boolean;
}> {
  const campaignName = readLine(value.campaignName, 60);
  const objective = readMultiline(value.objective, 2000) ?? readLine(value.objective, 280);
  const situation = typeof value.situation === "string" ? value.situation.trim() : "";
  if (!campaignName || !objective || situation.length === 0 || situation.length > 800) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!isChoice<UniverseId>(value.universe, UNIVERSES)) return { ok: false, error: INVALID_SAVE };
  if (!isChoice<UniverseTypeId>(value.universeType, UNIVERSE_TYPES)) {
    return { ok: false, error: INVALID_SAVE };
  }

  const universeLabel =
    value.universe === "custom" ? readLine(value.universeLabel, 40) : value.universeLabel === null ? null : undefined;
  if (universeLabel === undefined || (value.universe === "custom" && !universeLabel)) {
    return { ok: false, error: INVALID_SAVE };
  }

  const playerCount = PLAYER_COUNTS.find((count) => count === value.playerCount);
  if (playerCount === undefined) return { ok: false, error: INVALID_SAVE };
  if (!isChoice<DeathPenaltyId>(value.deathPenalty, DEATH_PENALTIES)) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!isChoice<EnemyDifficultyId>(value.enemyDifficulty, ENEMY_DIFFICULTIES)) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!isChoice<LootRarityId>(value.lootRarity, LOOT_RARITIES)) return { ok: false, error: INVALID_SAVE };
  if (!isChoice<PlayerFreedomId>(value.playerFreedom, PLAYER_FREEDOMS)) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (value.objectiveStatus !== "active" && value.objectiveStatus !== "complete" && value.objectiveStatus !== "failed") {
    return { ok: false, error: INVALID_SAVE };
  }
  const scene = readInteger(value.scene, 1);
  const revision = readInteger(value.revision, 1);
  if (scene === null || revision === null) return { ok: false, error: INVALID_SAVE };

  const storedOptions =
    value.characterOptions === undefined ? null : parseCharacterOptions(value.characterOptions);
  if (value.characterOptions !== undefined && !storedOptions) return { ok: false, error: INVALID_SAVE };
  const characterOptions =
    storedOptions ?? characterOptionsFor(value.universe) ?? coreCharacterOptions();

  let campaignConfiguration: CampaignSettings["campaignConfiguration"];
  if (value.campaignConfiguration !== undefined) {
    const parsed = parseStoredCampaignConfiguration(value.campaignConfiguration);
    if (!parsed) return { ok: false, error: INVALID_SAVE };
    campaignConfiguration = parsed;
  }

  let characterConfiguration: CampaignSettings["characterConfiguration"];
  if (value.characterConfiguration !== undefined) {
    const parsed = parseStoredCharacterConfiguration(value.characterConfiguration);
    if (!parsed) return { ok: false, error: INVALID_SAVE };
    characterConfiguration = parsed;
  }

  return {
    ok: true,
    value: {
      settings: {
        campaignName,
        universe: value.universe,
        universeLabel,
        universeType: value.universeType,
        playerCount,
        characterOptions,
        objective,
        deathPenalty: value.deathPenalty,
        enemyDifficulty: value.enemyDifficulty,
        lootRarity: value.lootRarity,
        playerFreedom: value.playerFreedom,
        campaignConfiguration,
        characterConfiguration,
      },
      objectiveStatus: value.objectiveStatus,
      scene,
      situation,
      revision,
      characterOptions,
      requireTraits: storedOptions !== null,
    },
  };
}

function parseCampaignSave(value: unknown): ParsedSave {
  if (!isRecord(value) || value.schemaVersion !== 1) return { ok: false, error: INVALID_SAVE };
  const phase = value.phase === "play" ? "play" : value.phase === "lobby" ? "lobby" : null;
  if (!phase) return { ok: false, error: INVALID_SAVE };
  if (!emptyList(value.forcedCheckCharacterIds) || value.openCheck !== null) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!emptyList(value.intentQueue)) return { ok: false, error: INVALID_SAVE };
  if (phase === "lobby" && !emptyList(value.transcript)) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (phase === "play" && !Array.isArray(value.transcript)) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!Array.isArray(value.characters) || value.characters.length < 1 || value.characters.length > 6) {
    return { ok: false, error: INVALID_SAVE };
  }

  const header = readCampaignHeader(value);
  if (!header.ok) return header;

  const names = new Set<string>();
  const ids = new Set<string>();
  const claimCodes = new Set<string>();
  const characters: TableCharacter[] = [];
  for (const entry of value.characters) {
    const character =
      phase === "play"
        ? readPlayCharacter(
            entry,
            names,
            ids,
            claimCodes,
            header.value.characterOptions,
            header.value.requireTraits,
          )
        : readCharacter(
            entry,
            names,
            ids,
            claimCodes,
            header.value.characterOptions,
            header.value.requireTraits,
          );
    if (!character) return { ok: false, error: INVALID_SAVE };
    characters.push(character);
  }
  if (characters.filter((character) => character.owner === "host").length !== 1) {
    return { ok: false, error: INVALID_SAVE };
  }

  const location = phase === "play" ? readLocation(value.location) : emptyLocation();
  const transcript =
    phase === "play" ? (value.transcript as TranscriptEntry[]) : ([] as TranscriptEntry[]);
  const availableActions =
    phase === "play" ? parseSceneActions(value.availableActions) : ([] as SceneAction[]);
  const loadoutReady = phase === "play" ? value.loadoutReady === true : false;
  if (phase === "play" && value.loadoutReady !== true && value.loadoutReady !== false) {
    return { ok: false, error: INVALID_SAVE };
  }
  const journey =
    phase === "play" ? parseJourney(value.journey, location.place) : emptyJourney();
  const campaignPlan = readSavePlan(value.campaignPlan);
  if (!campaignPlan.ok) return campaignPlan;

  return {
    ok: true,
    value: {
      phase,
      settings: header.value.settings,
      objectiveStatus: header.value.objectiveStatus,
      scene: header.value.scene,
      situation: header.value.situation,
      revision: header.value.revision,
      characters,
      location,
      transcript,
      availableActions,
      loadoutReady,
      journey,
      campaignPlan: campaignPlan.value,
      ...sceneImageFieldsFromSave(value),
    },
  };
}

export function campaignSaveFilename(campaignName: string): string {
  const slug = campaignName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "campaign"}.rpg.json`;
}

export function buildCampaignSaveDocument(table: TableState): Record<string, unknown> {
  const { settings } = table;
  const phase = table.phase === "play" ? "play" : "lobby";
  const document: Record<string, unknown> = {
    schemaVersion: 1,
    phase,
    campaignName: settings.campaignName,
    universe: settings.universe,
    universeLabel: settings.universeLabel,
    universeType: settings.universeType,
    playerCount: settings.playerCount,
    objective: settings.objective,
    deathPenalty: settings.deathPenalty,
    enemyDifficulty: settings.enemyDifficulty,
    lootRarity: settings.lootRarity,
    playerFreedom: settings.playerFreedom,
    objectiveStatus: table.objectiveStatus,
    scene: table.scene,
    situation: table.situation,
    revision: table.revision,
    characters: table.characters,
    forcedCheckCharacterIds: [],
    openCheck: null,
    intentQueue: [],
    transcript: phase === "play" ? table.transcript : [],
  };
  if (settings.campaignConfiguration !== undefined) {
    document.campaignConfiguration = settings.campaignConfiguration;
  }
  if (settings.characterConfiguration !== undefined) {
    document.characterConfiguration = settings.characterConfiguration;
  }
  if (settings.characterOptions) {
    document.characterOptions = settings.characterOptions;
  }
  if (table.campaignPlan) document.campaignPlan = table.campaignPlan;
  if (phase === "play") {
    document.location = table.location;
    document.availableActions = table.availableActions;
    document.loadoutReady = table.loadoutReady;
    document.journey = table.journey;
  }
  if ((table.gmTurnCount ?? 0) > 0 || table.sceneImageId) {
    document.gmTurnCount = table.gmTurnCount ?? 0;
    document.lastImageGmTurn = table.lastImageGmTurn ?? -1;
    document.sceneImageRevision = table.sceneImageRevision ?? 0;
    if (table.sceneImageId) document.sceneImageId = table.sceneImageId;
  }
  return document;
}

export function downloadCampaignSave(table: TableState): string | null {
  if (typeof window === "undefined") return "Export is not available here.";
  const raw = JSON.stringify(buildCampaignSaveDocument(table), null, 2);
  if (raw.length > SAVE_TEXT_MAX) return "This save is too large to export.";
  try {
    window.localStorage.setItem(HOST_SAVE_STORAGE_KEY, raw);
  } catch {
    // Download still works when local storage is full.
  }
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = campaignSaveFilename(table.settings.campaignName);
  anchor.click();
  URL.revokeObjectURL(url);
  return null;
}

export function readBrowserSave(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(HOST_SAVE_STORAGE_KEY);
    if (!raw || raw.trim() === "") return null;
    return raw;
  } catch {
    return null;
  }
}

export function startFromCampaignSave(
  raw: string,
): { ok: true; roomCode: string; phase: "lobby" | "play" } | { ok: false; error: string } {
  if (raw.length > SAVE_TEXT_MAX) return { ok: false, error: INVALID_SAVE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: INVALID_SAVE };
  }

  const save = parseCampaignSave(parsed);
  if (!save.ok) return save;

  try {
    const roomCode = createRoomCode();
    const table: TableState =
      save.value.phase === "play"
        ? {
            roomCode,
            roomStatus: "open",
            phase: "play",
            settings: save.value.settings,
            objectiveStatus: save.value.objectiveStatus,
            scene: save.value.scene,
            situation: save.value.situation,
            location: save.value.location,
            revision: save.value.revision,
            characters: save.value.characters,
            transcript: save.value.transcript,
            availableActions: save.value.availableActions,
            loadoutReady: save.value.loadoutReady,
            gmBusy: false,
            journey: save.value.journey,
            campaignPlan: save.value.campaignPlan,
            gmTurnCount: save.value.gmTurnCount,
            lastImageGmTurn: save.value.lastImageGmTurn,
            sceneImageId: save.value.sceneImageId,
            sceneImageRevision: save.value.sceneImageRevision,
            imageBusy: false,
          }
        : {
            roomCode,
            roomStatus: "open",
            phase: "lobby",
            settings: save.value.settings,
            objectiveStatus: save.value.objectiveStatus,
            scene: save.value.scene,
            situation: save.value.situation,
            location: emptyLocation(),
            revision: save.value.revision,
            characters: save.value.characters.map((character) => ({
              ...character,
              ready: false,
              currency: character.currency ?? 0,
              inventory: character.inventory ?? [],
            })),
            transcript: [],
            availableActions: [],
            loadoutReady: false,
            gmBusy: false,
            journey: emptyJourney(),
            campaignPlan: save.value.campaignPlan,
            ...defaultSceneImageState(),
          };
    writeHostSession({ roomCode, table });
    try {
      window.localStorage.setItem(HOST_SAVE_STORAGE_KEY, raw);
    } catch {
      // Session restore still works from session storage.
    }
    return { ok: true, roomCode, phase: save.value.phase };
  } catch {
    return { ok: false, error: "The game could not be stored in this browser." };
  }
}

export function startLobbyFromSave(
  raw: string,
): { ok: true; roomCode: string } | { ok: false; error: string } {
  const result = startFromCampaignSave(raw);
  if (!result.ok) return result;
  if (result.phase !== "lobby") {
    return { ok: false, error: "Only a lobby save can be loaded here." };
  }
  return { ok: true, roomCode: result.roomCode };
}
