import {
  characterOptionsFor,
  coreCharacterOptions,
  parseCharacterOptions,
  parseStatBlock,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import { storedRacePicks, type TableCharacter, type Wound } from "@/rpg/lib/character";
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
import { createRoomCode, isClaimCode } from "@/rpg/lib/room-code";
import { writeHostSession } from "@/rpg/lib/host-session";
import type { TableState } from "@/rpg/lib/table";

export const HOST_SAVE_STORAGE_KEY = "rpg.host.save";

const SAVE_TEXT_MAX = 256_000;
const INVALID_SAVE = "This save is not valid.";
const LOBBY_ONLY = "Only a lobby save can be loaded.";
const NAME_PATTERN = /^[A-Za-z0-9 '\-]+$/;
const CHARACTER_ID_PATTERN = /^pc_[0-9a-f]{8}$/;
const WOUND_PREFIXES: readonly Wound[][] = [
  [],
  ["hurt"],
  ["hurt", "impaired"],
  ["hurt", "impaired", "down"],
];

interface LobbySave {
  settings: CampaignSettings;
  objectiveStatus: TableState["objectiveStatus"];
  scene: number;
  situation: string;
  revision: number;
  characters: TableCharacter[];
}

type ParsedSave = { ok: true; value: LobbySave } | { ok: false; error: string };

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
    claimCode: value.claimCode,
    owner: value.owner,
    archived: false,
    inScene: value.inScene,
    ready: value.ready === true,
    currency: typeof value.currency === "number" && Number.isFinite(value.currency) && value.currency >= 0
      ? Math.floor(value.currency)
      : 0,
    inventory: [],
  };
}

function readTraitId(value: unknown, traits: { id: string }[], required: boolean): string | null {
  if (typeof value !== "string" || value === "") return required ? null : "";
  if (!traits.some((entry) => entry.id === value)) return null;
  return value;
}

function emptyList(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function parseLobbySave(value: unknown): ParsedSave {
  if (!isRecord(value) || value.schemaVersion !== 1) return { ok: false, error: INVALID_SAVE };
  if (value.phase === "play" || value.phase === "ended") return { ok: false, error: LOBBY_ONLY };
  if (value.phase !== "lobby") return { ok: false, error: INVALID_SAVE };
  if (!emptyList(value.forcedCheckCharacterIds) || value.openCheck !== null) {
    return { ok: false, error: INVALID_SAVE };
  }
  if (!emptyList(value.intentQueue) || !emptyList(value.transcript)) {
    return { ok: false, error: INVALID_SAVE };
  }

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
  if (!Array.isArray(value.characters) || value.characters.length < 1 || value.characters.length > 6) {
    return { ok: false, error: INVALID_SAVE };
  }

  const storedOptions =
    value.characterOptions === undefined ? null : parseCharacterOptions(value.characterOptions);
  if (value.characterOptions !== undefined && !storedOptions) return { ok: false, error: INVALID_SAVE };
  const characterOptions =
    storedOptions ?? characterOptionsFor(value.universe) ?? coreCharacterOptions();

  const names = new Set<string>();
  const ids = new Set<string>();
  const claimCodes = new Set<string>();
  const characters: TableCharacter[] = [];
  for (const entry of value.characters) {
    const character = readCharacter(entry, names, ids, claimCodes, characterOptions, storedOptions !== null);
    if (!character) return { ok: false, error: INVALID_SAVE };
    characters.push(character);
  }
  if (characters.filter((character) => character.owner === "host").length !== 1) {
    return { ok: false, error: INVALID_SAVE };
  }

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
      characters,
    },
  };
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

export function startLobbyFromSave(
  raw: string,
): { ok: true; roomCode: string } | { ok: false; error: string } {
  if (raw.length > SAVE_TEXT_MAX) return { ok: false, error: INVALID_SAVE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: INVALID_SAVE };
  }

  const save = parseLobbySave(parsed);
  if (!save.ok) return save;

  try {
    const roomCode = createRoomCode();
    const table: TableState = {
      roomCode,
      roomStatus: "open",
      phase: "lobby",
      settings: save.value.settings,
      objectiveStatus: save.value.objectiveStatus,
      scene: save.value.scene,
      situation: save.value.situation,
      location: { place: "", weather: "", reputation: "" },
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
    };
    writeHostSession({ roomCode, table });
    return { ok: true, roomCode };
  } catch {
    return { ok: false, error: "The game could not be stored in this browser." };
  }
}
