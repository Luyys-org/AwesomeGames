import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import {
  characterOptionsFor,
  coreCharacterOptions,
  parseCharacterOptions,
  parseItemModifiers,
  parseItemSlot,
  parseStatBlock,
  readItemModifiers,
  readItemSlot,
  type CharacterOptions,
  type StatDefinition,
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
import { createItemId } from "@/rpg/lib/ids";
import { canPerformSceneAction, parseSceneActions } from "@/rpg/lib/scene-action";
import { levelRewardOptions, progressionRules } from "@/rpg/lib/progression";

export { parseSceneActions } from "@/rpg/lib/scene-action";
import {
  currencyRange,
  emptyInventory,
  equipmentCountRange,
  type DraftStartingKit,
} from "@/rpg/lib/starting-kit";

export type TablePhase = "waiting" | "lobby" | "play";

export interface SceneLocation {
  place: string;
  weather: string;
  reputation: string;
}

export const UNREADABLE_GM_RESULT = "The game master returned an unreadable result.";

export type TranscriptEntry =
  | { type: "situation"; scene: number; text: string }
  | {
      type: "intent";
      characterId: string;
      kind: "act" | "treat" | "speak";
      text: string;
      actionId?: string;
      failed?: boolean;
    }
  | { type: "narration"; text: string }
  | { type: "check"; characterId: string; line: string }
  | { type: "wound"; characterId: string; wounds: Wound[] }
  | { type: "death"; characterId: string; penalty: CampaignSettings["deathPenalty"] }
  | { type: "system"; text: string }
  | { type: "gm-error"; text: string }
  | { type: "reward"; characterId: string; text: string };

export function isGmErrorEntry(entry: TranscriptEntry): boolean {
  return (
    entry.type === "gm-error" ||
    (entry.type === "system" && entry.text === UNREADABLE_GM_RESULT)
  );
}

export type SceneActionDifficulty = 8 | 10 | 12 | 15;

export type SceneActionFailure = "setback" | "harm" | "severe";

export interface SceneAction {
  id: string;
  label: string;
  stat: string;
  difficulty: SceneActionDifficulty;
  failure: SceneActionFailure;
  /** Skill id when only that skill grants +2 on this action. */
  abilityId?: string;
  /** When set, only these in-scene characters may take the action. Omit for anyone eligible. */
  characterIds?: string[];
  /** When set, only the character carrying this inventory item may take the action. */
  itemId?: string;
}

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
  availableActions: SceneAction[];
  loadoutReady: boolean;
  gmBusy: boolean;
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
  level: number;
  xp: number;
  pendingRewards: number;
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
  availableActions: SceneAction[];
  loadoutReady: boolean;
  gmBusy: boolean;
  statCeiling: number;
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
    availableActions: Array.isArray(table.availableActions) ? table.availableActions : [],
    loadoutReady: table.loadoutReady === true,
    gmBusy: table.gmBusy === true,
    characters: table.characters.map(normalizeTableCharacter),
  };
}

function normalizeTableCharacter(character: TableCharacter): TableCharacter {
  return {
    ...character,
    ready: character.ready === true,
    currency: Number.isFinite(character.currency) ? character.currency : 0,
    inventory: Array.isArray(character.inventory)
      ? character.inventory.map((item) => ({
          ...item,
          slot: typeof item.slot === "string" ? item.slot : "",
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        }))
      : [],
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
    availableActions: [],
    loadoutReady: false,
    gmBusy: false,
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
    currency: 0,
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
  return living.length >= 1 && living.every((character) => character.ready);
}

export function startCampaign(
  table: TableState,
): { ok: true; table: TableState } | { ok: false; error: string } {
  const living = table.characters.filter((character) => !character.archived);
  if (table.phase !== "lobby") return { ok: false, error: "The lobby is not open." };
  if (living.length < 1) return { ok: false, error: "At least one character is needed to start." };
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
      availableActions: [],
      loadoutReady: false,
    },
  };
}

export function applyStartingLoadout(
  table: TableState,
  kits: DraftStartingKit[],
  actions: SceneAction[],
): { ok: true; table: TableState } | { ok: false; error: string } {
  if (table.phase !== "play") return { ok: false, error: "The campaign has not started." };
  const living = table.characters.filter((character) => !character.archived);
  if (kits.length !== living.length) {
    return { ok: false, error: "Return one kit for each living character." };
  }

  const byId = new Map(kits.map((kit) => [kit.characterId, kit]));
  const characters: TableCharacter[] = [];
  for (const character of table.characters) {
    if (character.archived) {
      characters.push(character);
      continue;
    }
    const kit = byId.get(character.id);
    if (!kit) return { ok: false, error: `Missing kit for ${character.name}.` };
    const checked = checkKit(table, character, kit);
    if (!checked.ok) return checked;
    characters.push({
      ...character,
      currency: kit.currency,
      inventory: kit.inventory.map((item) => ({
        id: createItemId(),
        name: item.name,
        slot: item.slot,
        equipped: item.equipped,
        modifiers: item.modifiers,
      })),
    });
  }

  return {
    ok: true,
    table: {
      ...table,
      revision: table.revision + 1,
      characters,
      availableActions: actions,
      loadoutReady: true,
    },
  };
}

function checkKit(
  table: TableState,
  character: TableCharacter,
  kit: DraftStartingKit,
): { ok: true } | { ok: false; error: string } {
  const wealth = table.settings.characterConfiguration?.startingWealth;
  const abundance = table.settings.campaignConfiguration?.currencyAbundance;
  const money = currencyRange(wealth, abundance);
  if (!Number.isInteger(kit.currency) || kit.currency < money.min || kit.currency > money.max) {
    return {
      ok: false,
      error: `Currency for ${character.name} must be an integer from ${money.min} to ${money.max}.`,
    };
  }

  const gear = equipmentCountRange(table.settings.characterConfiguration?.startingEquipment);
  if (kit.inventory.length < gear.min || kit.inventory.length > gear.max) {
    return {
      ok: false,
      error: `${character.name} must have ${gear.min} to ${gear.max} starting items.`,
    };
  }

  for (const item of kit.inventory) {
    if (item.name.trim().length === 0 || item.name.length > 80) {
      return { ok: false, error: `Each item name for ${character.name} must be 1 to 80 characters.` };
    }
    const modifiers = readItemModifiers(item.modifiers, table.settings.characterOptions.stats);
    if (!modifiers.ok) return { ok: false, error: modifiers.error };
    const slot = readItemSlot(item.slot);
    if (!slot.ok) return { ok: false, error: slot.error };
  }

  return { ok: true };
}

const INTENT_MAX = 400;

export function commitSetItemEquipped(
  table: TableState,
  characterId: string,
  itemId: string,
  equipped: boolean,
): { ok: true; table: TableState } | { ok: false; error: string } {
  if (table.phase !== "play") return { ok: false, error: "The campaign has not started." };
  if (!table.loadoutReady) return { ok: false, error: "The game master is still preparing." };
  if (table.gmBusy) return { ok: false, error: "The game master is answering." };

  const character = table.characters.find((entry) => entry.id === characterId);
  if (!character || character.archived) return { ok: false, error: "That character is not at the table." };
  if (!character.inScene) return { ok: false, error: "You are not in this scene." };

  const index = character.inventory.findIndex((entry) => entry.id === itemId);
  if (index < 0) return { ok: false, error: "That item is not in your inventory." };
  const item = character.inventory[index];
  if (!item) return { ok: false, error: "That item is not in your inventory." };
  if (item.equipped === equipped) return { ok: true, table };

  if (equipped && item.slot.length > 0) {
    const conflict = character.inventory.find(
      (entry) => entry.id !== item.id && entry.equipped && entry.slot === item.slot,
    );
    if (conflict) {
      return { ok: false, error: `You already have ${conflict.name} equipped in that slot.` };
    }
  }

  const inventory = character.inventory.slice();
  inventory[index] = { ...item, equipped };
  const characters = table.characters.map((entry) =>
    entry.id === characterId ? { ...entry, inventory } : entry,
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

export function commitSpeak(
  table: TableState,
  characterId: string,
  text: string,
): { ok: true; table: TableState } | { ok: false; error: string } {
  return commitIntent(table, characterId, "speak", text, "Say something.");
}

export function commitSceneAction(
  table: TableState,
  characterId: string,
  actionId: string,
): { ok: true; table: TableState } | { ok: false; error: string } {
  const action = table.availableActions.find((entry) => entry.id === actionId);
  if (!action) return { ok: false, error: "Choose an action." };
  const character = table.characters.find((entry) => entry.id === characterId);
  if (!character) return { ok: false, error: "That character is not at the table." };
  if (!canPerformSceneAction(character, action, table.characters)) {
    return { ok: false, error: "That character cannot take that action." };
  }
  return commitIntent(table, characterId, "act", action.label, "Choose an action.", action.id);
}

function commitIntent(
  table: TableState,
  characterId: string,
  kind: "act" | "speak",
  text: string,
  empty: string,
  actionId?: string,
): { ok: true; table: TableState } | { ok: false; error: string } {
  if (table.phase !== "play") return { ok: false, error: "The campaign has not started." };
  if (!table.loadoutReady) return { ok: false, error: "The game master is still preparing." };
  if (table.gmBusy) return { ok: false, error: "The game master is answering." };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, error: empty };
  if (trimmed.length > INTENT_MAX) return { ok: false, error: "That action is too long." };

  const character = table.characters.find((entry) => entry.id === characterId);
  if (!character || character.archived) return { ok: false, error: "That character is not at the table." };
  if (!character.inScene) return { ok: false, error: "You are not in this scene." };
  if (character.wounds.includes("down")) return { ok: false, error: "You cannot act while down." };

  const entry: TranscriptEntry = {
    type: "intent",
    characterId,
    kind,
    text: trimmed,
    ...(kind === "act" && actionId ? { actionId } : {}),
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
    availableActions: table.availableActions,
    loadoutReady: table.loadoutReady,
    gmBusy: table.gmBusy === true,
    statCeiling: progressionRules(table.settings).statCeiling,
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
    inventory: Array.isArray(character.inventory)
      ? character.inventory.map((item) => ({
          ...item,
          slot: typeof item.slot === "string" ? item.slot : "",
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        }))
      : [],
    level: character.level > 0 ? character.level : 1,
    xp: Number.isFinite(character.xp) && character.xp >= 0 ? Math.floor(character.xp) : 0,
    pendingRewards:
      Number.isFinite(character.pendingRewards) && character.pendingRewards > 0
        ? Math.floor(character.pendingRewards)
        : 0,
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
    availableActions: parseSceneActions(value.availableActions),
    loadoutReady: value.loadoutReady === true,
    gmBusy: value.gmBusy === true,
    statCeiling: readStatCeiling(value.statCeiling, characterOptions.statCap),
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
    inventory: parseInventory(value.inventory, options.stats),
    level: readLevel(value.level),
    xp: readXp(value.xp),
    pendingRewards: readPendingRewards(value.pendingRewards),
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

function readLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return 1;
  return value;
}

function readXp(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(1000, Math.floor(value));
}

function readPendingRewards(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return 0;
  return value;
}

function readStatCeiling(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return fallback;
  return value;
}

export function commitLevelReward(
  table: TableState,
  characterId: string,
  choice: { kind: "stat"; statId: string } | { kind: "skill"; skillId: string },
): { ok: true; table: TableState } | { ok: false; error: string } {
  const character = table.characters.find((entry) => entry.id === characterId);
  if (!character || character.archived) return { ok: false, error: "That character is not at the table." };
  if (character.pendingRewards < 1) return { ok: false, error: "That character has no level reward to choose." };
  const options = levelRewardOptions(character, table.settings);
  const match =
    choice.kind === "stat"
      ? options.find((entry) => entry.kind === "stat" && entry.statId === choice.statId)
      : options.find((entry) => entry.kind === "skill" && entry.skillId === choice.skillId);
  if (!match) return { ok: false, error: "Choose a reward from the list." };

  const nextCharacter: TableCharacter =
    match.kind === "stat"
      ? {
          ...character,
          pendingRewards: character.pendingRewards - 1,
          stats: { ...character.stats, [match.statId]: (character.stats[match.statId] ?? 0) + 1 },
        }
      : {
          ...character,
          pendingRewards: character.pendingRewards - 1,
          extraAbilityId: match.skillId,
        };

  return {
    ok: true,
    table: {
      ...table,
      revision: table.revision + 1,
      characters: table.characters.map((entry) => (entry.id === character.id ? nextCharacter : entry)),
      transcript: [
        ...table.transcript,
        { type: "reward", characterId: character.id, text: `${character.name} chooses ${match.label}.` },
      ],
    },
  };
}

function parseInventory(value: unknown, stats: StatDefinition[]): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  const items: InventoryItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.name !== "string") continue;
    const name = entry.name.trim();
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

export function markLoadoutFailed(table: TableState): TableState {
  return {
    ...table,
    revision: table.revision + 1,
    loadoutReady: true,
    transcript: [
      ...table.transcript,
      { type: "system", text: "The game master returned an unreadable starting loadout." },
    ],
  };
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
    (value.kind === "act" || value.kind === "treat" || value.kind === "speak")
  ) {
    return {
      type: "intent",
      characterId: value.characterId,
      kind: value.kind,
      text: value.text,
      ...(typeof value.actionId === "string" && value.actionId.length > 0 ? { actionId: value.actionId } : {}),
      ...(value.failed === true ? { failed: true } : {}),
    };
  }
  if (value.type === "narration" && typeof value.text === "string") {
    return { type: "narration", text: value.text };
  }
  if (value.type === "check" && typeof value.characterId === "string" && typeof value.line === "string") {
    const line = value.line.trim();
    if (line.length === 0) return null;
    return { type: "check", characterId: value.characterId, line };
  }
  if (value.type === "wound" && typeof value.characterId === "string") {
    return { type: "wound", characterId: value.characterId, wounds: readWounds(value.wounds) };
  }
  if (
    value.type === "death" &&
    typeof value.characterId === "string" &&
    isDeathPenalty(value.penalty)
  ) {
    return { type: "death", characterId: value.characterId, penalty: value.penalty };
  }
  if (value.type === "system" && typeof value.text === "string") {
    return { type: "system", text: value.text };
  }
  if (value.type === "gm-error" && typeof value.text === "string") {
    return { type: "gm-error", text: value.text };
  }
  if (value.type === "reward" && typeof value.characterId === "string" && typeof value.text === "string") {
    return { type: "reward", characterId: value.characterId, text: value.text };
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
