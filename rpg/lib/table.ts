import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import {
  characterOptionsFor,
  coreCharacterOptions,
  parseCharacterOptions,
  parseStatBlock,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import {
  addCharacter,
  storedRacePicks,
  type CharacterDraft,
  type InventoryItem,
  type Owner,
  type TableCharacter,
  type Wound,
} from "@/rpg/lib/character";
import { emptyInventory, startingCurrency } from "@/rpg/lib/starting-kit";

export type TablePhase = "waiting" | "lobby" | "play";

export interface SceneLocation {
  place: string;
  weather: string;
  reputation: string;
}

export type TranscriptEntry =
  | { type: "situation"; scene: number; text: string }
  | { type: "intent"; characterId: string; kind: "act" | "treat"; text: string }
  | { type: "narration"; text: string }
  | { type: "system"; text: string };

export interface TableState {
  roomCode: string;
  roomStatus: "open" | "closed";
  phase: TablePhase;
  settings: CampaignSettings;
  objectiveStatus: "active" | "complete" | "failed";
  scene: number;
  situation: string;
  location: SceneLocation;
  revision: number;
  characters: TableCharacter[];
  transcript: TranscriptEntry[];
}

export interface PublicCharacter {
  id: string;
  name: string;
  abilityId: string;
  extraAbilityId: string;
  classId: string;
  raceId: string;
  raceStatIds: string[];
  stats: Record<string, number>;
  wounds: Wound[];
  owner: Owner;
  archived: boolean;
  inScene: boolean;
  ready: boolean;
  currency: number;
  inventory: InventoryItem[];
}

export interface TableSnapshot {
  revision: number;
  roomCode: string;
  roomStatus: "open" | "closed";
  phase: "lobby" | "play";
  campaignName: string;
  universe: CampaignSettings["universe"];
  universeLabel: string | null;
  universeType: CampaignSettings["universeType"];
  playerCount: number;
  objective: string;
  objectiveStatus: TableState["objectiveStatus"];
  deathPenalty: CampaignSettings["deathPenalty"];
  enemyDifficulty: CampaignSettings["enemyDifficulty"];
  lootRarity: CampaignSettings["lootRarity"];
  playerFreedom: CampaignSettings["playerFreedom"];
  characterOptions: CharacterOptions;
  scene: number;
  situation: string;
  location: SceneLocation;
  characters: PublicCharacter[];
  transcript: TranscriptEntry[];
  openCheck: null;
  intentQueue: [];
}

export function emptyLocation(): SceneLocation {
  return { place: "", weather: "", reputation: "" };
}

export function normalizeTable(table: TableState): TableState {
  return {
    ...table,
    location: table.location ?? emptyLocation(),
    transcript: Array.isArray(table.transcript) ? table.transcript : [],
    characters: table.characters.map(normalizeTableCharacter),
  };
}

function normalizeTableCharacter(character: TableCharacter): TableCharacter {
  return {
    ...character,
    ready: character.ready === true,
    currency: Number.isFinite(character.currency) ? character.currency : 0,
    inventory: Array.isArray(character.inventory) ? character.inventory : [],
  };
}

export function createTable(roomCode: string, settings: CampaignSettings): TableState {
  return {
    roomCode,
    roomStatus: "open",
    phase: "waiting",
    settings,
    objectiveStatus: "active",
    scene: 1,
    situation: "",
    location: emptyLocation(),
    revision: 0,
    characters: [],
    transcript: [],
  };
}

export function commitCharacter(
  table: TableState,
  draft: CharacterDraft,
  owner: Owner,
): { ok: true; table: TableState; character: TableCharacter } | { ok: false; error: string } {
  if (owner === "peer" && table.phase !== "lobby") {
    return { ok: false, error: "The lobby is not open yet." };
  }

  const options =
    table.settings.characterOptions ??
    characterOptionsFor(table.settings.universe) ??
    coreCharacterOptions();
  const created = addCharacter(table.characters, draft, owner, options);
  if (!created.ok) return created;

  const opening = table.phase === "waiting";
  const character: TableCharacter = {
    ...created.character,
    ready: false,
    currency: startingCurrency(table.settings.characterConfiguration?.startingWealth),
    inventory: emptyInventory(),
  };

  return {
    ok: true,
    character,
    table: {
      ...table,
      phase: "lobby",
      revision: opening ? 1 : table.revision + 1,
      characters: [...table.characters, character],
    },
  };
}

export function setCharacterReady(
  table: TableState,
  characterId: string,
  ready: boolean,
): { ok: true; table: TableState } | { ok: false; error: string } {
  if (table.phase !== "lobby") {
    return { ok: false, error: "The campaign has already started." };
  }

  const index = table.characters.findIndex((character) => character.id === characterId && !character.archived);
  if (index < 0) return { ok: false, error: "That character is not at the table." };

  const characters = table.characters.map((character, current) =>
    current === index ? { ...character, ready } : character,
  );

  return {
    ok: true,
    table: {
      ...table,
      revision: table.revision + 1,
      characters,
    },
  };
}

export function canStartCampaign(table: TableState, joiningCount: number): boolean {
  if (table.phase !== "lobby") return false;
  if (joiningCount > 0) return false;
  const living = table.characters.filter((character) => !character.archived);
  return living.length >= 2 && living.every((character) => character.ready);
}

export function startCampaign(
  table: TableState,
): { ok: true; table: TableState } | { ok: false; error: string } {
  const living = table.characters.filter((character) => !character.archived);
  if (table.phase !== "lobby") return { ok: false, error: "The lobby is not open." };
  if (living.length < 2) return { ok: false, error: "At least two characters are needed to start." };
  if (!living.every((character) => character.ready)) {
    return { ok: false, error: "Every character must be ready." };
  }

  const situationEntry: TranscriptEntry = {
    type: "situation",
    scene: table.scene,
    text: table.situation,
  };

  return {
    ok: true,
    table: {
      ...table,
      phase: "play",
      revision: table.revision + 1,
      characters: table.characters.map((character) =>
        character.archived ? character : { ...character, inScene: true },
      ),
      transcript: table.transcript.length > 0 ? table.transcript : [situationEntry],
    },
  };
}

const INTENT_MAX = 400;

export function commitAct(
  table: TableState,
  characterId: string,
  text: string,
): { ok: true; table: TableState } | { ok: false; error: string } {
  if (table.phase !== "play") return { ok: false, error: "The campaign has not started." };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, error: "Say what you do or speak." };
  if (trimmed.length > INTENT_MAX) return { ok: false, error: "That action is too long." };

  const character = table.characters.find((entry) => entry.id === characterId);
  if (!character || character.archived) return { ok: false, error: "That character is not at the table." };
  if (!character.inScene) return { ok: false, error: "You are not in this scene." };
  if (character.wounds.includes("down")) return { ok: false, error: "You cannot act while down." };

  const entry: TranscriptEntry = {
    type: "intent",
    characterId,
    kind: "act",
    text: trimmed,
  };

  return {
    ok: true,
    table: {
      ...table,
      revision: table.revision + 1,
      transcript: [...table.transcript, entry],
    },
  };
}

export function toSnapshot(table: TableState): TableSnapshot | null {
  if ((table.phase !== "lobby" && table.phase !== "play") || table.revision < 1) return null;

  return {
    revision: table.revision,
    roomCode: table.roomCode,
    roomStatus: table.roomStatus,
    phase: table.phase,
    campaignName: table.settings.campaignName,
    universe: table.settings.universe,
    universeLabel: table.settings.universeLabel,
    universeType: table.settings.universeType,
    playerCount: table.settings.playerCount,
    objective: table.settings.objective,
    objectiveStatus: table.objectiveStatus,
    deathPenalty: table.settings.deathPenalty,
    enemyDifficulty: table.settings.enemyDifficulty,
    lootRarity: table.settings.lootRarity,
    playerFreedom: table.settings.playerFreedom,
    characterOptions:
      table.settings.characterOptions ??
      characterOptionsFor(table.settings.universe) ??
      coreCharacterOptions(),
    scene: table.scene,
    situation: table.situation,
    location: table.location,
    characters: table.characters.map(toPublicCharacter),
    transcript: table.transcript,
    openCheck: null,
    intentQueue: [],
  };
}

export function toPublicCharacter(character: TableCharacter): PublicCharacter {
  return {
    id: character.id,
    name: character.name,
    abilityId: character.abilityId,
    extraAbilityId: character.extraAbilityId || "",
    classId: character.classId || "",
    raceId: character.raceId || "",
    raceStatIds: character.raceStatIds ?? [],
    stats: character.stats,
    wounds: character.wounds,
    owner: character.owner,
    archived: character.archived,
    inScene: character.inScene,
    ready: character.ready === true,
    currency: Number.isFinite(character.currency) ? character.currency : 0,
    inventory: Array.isArray(character.inventory) ? character.inventory : [],
  };
}

export function parseSnapshot(value: unknown): TableSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.phase !== "lobby" && value.phase !== "play") return null;
  if (typeof value.revision !== "number" || typeof value.roomCode !== "string") return null;
  if (typeof value.campaignName !== "string" || typeof value.objective !== "string") return null;
  if (typeof value.playerCount !== "number") return null;
  if (!Array.isArray(value.characters)) return null;

  const characterOptions = resolveSnapshotOptions(value.universe, value.characterOptions);
  if (!characterOptions) return null;

  const characters: PublicCharacter[] = [];
  for (const entry of value.characters) {
    const character = parsePublicCharacter(entry, characterOptions);
    if (!character) return null;
    characters.push(character);
  }

  return {
    revision: value.revision,
    roomCode: value.roomCode,
    roomStatus: value.roomStatus === "closed" ? "closed" : "open",
    phase: value.phase,
    campaignName: value.campaignName,
    universe: isUniverse(value.universe) ? value.universe : "custom",
    universeLabel: typeof value.universeLabel === "string" ? value.universeLabel : null,
    universeType: isUniverseType(value.universeType) ? value.universeType : "fantasy",
    playerCount: value.playerCount,
    objective: value.objective,
    objectiveStatus: value.objectiveStatus === "complete" || value.objectiveStatus === "failed"
      ? value.objectiveStatus
      : "active",
    deathPenalty: isDeathPenalty(value.deathPenalty) ? value.deathPenalty : "wounded",
    enemyDifficulty: isEnemyDifficulty(value.enemyDifficulty) ? value.enemyDifficulty : "standard",
    lootRarity: isLootRarity(value.lootRarity) ? value.lootRarity : "uncommon",
    playerFreedom: isPlayerFreedom(value.playerFreedom) ? value.playerFreedom : "guided",
    characterOptions,
    scene: typeof value.scene === "number" ? value.scene : 1,
    situation: typeof value.situation === "string" ? value.situation : "",
    location: parseLocation(value.location),
    characters,
    transcript: parseTranscript(value.transcript),
    openCheck: null,
    intentQueue: [],
  };
}

function resolveSnapshotOptions(universe: unknown, value: unknown): CharacterOptions | null {
  if (value === undefined) {
    return characterOptionsFor(typeof universe === "string" ? universe : "") ?? coreCharacterOptions();
  }
  return parseCharacterOptions(value);
}

function parsePublicCharacter(value: unknown, options: CharacterOptions): PublicCharacter | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  if (typeof value.abilityId !== "string" || !options.skills.some((entry) => entry.id === value.abilityId)) {
    return null;
  }
  if (value.owner !== "host" && value.owner !== "peer") return null;
  const classId = readTraitId(value.classId, options.classes);
  const stats = parseStatBlock(value.stats, options, classId ?? "");
  if (!stats || classId === null) return null;
  const raceId = readTraitId(value.raceId, options.races);
  if (raceId === null) return null;
  const picks = storedRacePicks(options, raceId, value.abilityId, value.extraAbilityId, value.raceStatIds);
  if (!picks.ok) return null;

  return {
    id: value.id,
    name: value.name,
    abilityId: value.abilityId,
    extraAbilityId: picks.extraAbilityId,
    classId,
    raceId,
    raceStatIds: picks.raceStatIds,
    stats,
    wounds: readWounds(value.wounds),
    owner: value.owner,
    archived: value.archived === true,
    inScene: value.inScene !== false,
    ready: value.ready === true,
    currency: readCurrency(value.currency),
    inventory: parseInventory(value.inventory),
  };
}

function readTraitId(value: unknown, traits: { id: string }[]): string | null {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !traits.some((entry) => entry.id === value)) return null;
  return value;
}

function readCurrency(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function parseInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  const items: InventoryItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.name !== "string") continue;
    const name = entry.name.trim();
    if (name.length === 0 || name.length > 80) continue;
    items.push({ id: entry.id, name, equipped: entry.equipped === true });
  }
  return items;
}

function parseLocation(value: unknown): SceneLocation {
  if (!isRecord(value)) return emptyLocation();
  return {
    place: readLocationLine(value.place),
    weather: readLocationLine(value.weather),
    reputation: readLocationLine(value.reputation),
  };
}

function readLocationLine(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 80 ? trimmed.slice(0, 80) : trimmed;
}

function parseTranscript(value: unknown): TranscriptEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: TranscriptEntry[] = [];
  for (const entry of value) {
    const parsed = parseTranscriptEntry(entry);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

function parseTranscriptEntry(value: unknown): TranscriptEntry | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "situation" && typeof value.scene === "number" && typeof value.text === "string") {
    return { type: "situation", scene: value.scene, text: value.text };
  }
  if (
    value.type === "intent" &&
    typeof value.characterId === "string" &&
    typeof value.text === "string" &&
    (value.kind === "act" || value.kind === "treat")
  ) {
    return { type: "intent", characterId: value.characterId, kind: value.kind, text: value.text };
  }
  if (value.type === "narration" && typeof value.text === "string") {
    return { type: "narration", text: value.text };
  }
  if (value.type === "system" && typeof value.text === "string") {
    return { type: "system", text: value.text };
  }
  return null;
}

function readWounds(value: unknown): Wound[] {
  if (!Array.isArray(value)) return [];
  const allowed = ["hurt", "impaired", "down"] as const;
  const wounds: Wound[] = [];
  for (let index = 0; index < value.length && index < allowed.length; index += 1) {
    if (value[index] !== allowed[index]) break;
    wounds.push(allowed[index]);
  }
  return wounds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniverse(value: unknown): value is CampaignSettings["universe"] {
  return (
    value === "star-wars" ||
    value === "dungeons-and-dragons" ||
    value === "alien" ||
    value === "custom"
  );
}

function isUniverseType(value: unknown): value is CampaignSettings["universeType"] {
  return (
    value === "fantasy" ||
    value === "science-fiction" ||
    value === "horror" ||
    value === "modern" ||
    value === "historical" ||
    value === "post-apocalyptic"
  );
}

function isDeathPenalty(value: unknown): value is CampaignSettings["deathPenalty"] {
  return value === "wounded" || value === "out-of-scene" || value === "new-character";
}

function isEnemyDifficulty(value: unknown): value is CampaignSettings["enemyDifficulty"] {
  return value === "easy" || value === "standard" || value === "hard" || value === "severe";
}

function isLootRarity(value: unknown): value is CampaignSettings["lootRarity"] {
  return value === "scarce" || value === "uncommon" || value === "common" || value === "abundant";
}

function isPlayerFreedom(value: unknown): value is CampaignSettings["playerFreedom"] {
  return value === "narrow" || value === "guided" || value === "open";
}
