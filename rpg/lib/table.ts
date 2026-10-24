import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import {
  ABILITIES,
  addCharacter,
  type AbilityId,
  type CharacterDraft,
  type Owner,
  type Stats,
  type TableCharacter,
  type Wound,
} from "@/rpg/lib/character";

export interface TableState {
  roomCode: string;
  roomStatus: "open" | "closed";
  phase: "waiting" | "lobby";
  settings: CampaignSettings;
  objectiveStatus: "active" | "complete" | "failed";
  scene: number;
  situation: string;
  revision: number;
  characters: TableCharacter[];
}

export interface PublicCharacter {
  id: string;
  name: string;
  abilityId: AbilityId;
  stats: Stats;
  wounds: Wound[];
  owner: Owner;
  archived: boolean;
  inScene: boolean;
}

export interface TableSnapshot {
  revision: number;
  roomCode: string;
  roomStatus: "open" | "closed";
  phase: "lobby";
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
  scene: number;
  situation: string;
  characters: PublicCharacter[];
  transcript: [];
  openCheck: null;
  intentQueue: [];
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
    revision: 0,
    characters: [],
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

  const created = addCharacter(table.characters, draft, owner);
  if (!created.ok) return created;

  const opening = table.phase === "waiting";

  return {
    ok: true,
    character: created.character,
    table: {
      ...table,
      phase: "lobby",
      revision: opening ? 1 : table.revision + 1,
      characters: [...table.characters, created.character],
    },
  };
}

export function toSnapshot(table: TableState): TableSnapshot | null {
  if (table.phase !== "lobby" || table.revision < 1) return null;

  return {
    revision: table.revision,
    roomCode: table.roomCode,
    roomStatus: table.roomStatus,
    phase: "lobby",
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
    scene: table.scene,
    situation: table.situation,
    characters: table.characters.map(toPublicCharacter),
    transcript: [],
    openCheck: null,
    intentQueue: [],
  };
}

export function toPublicCharacter(character: TableCharacter): PublicCharacter {
  return {
    id: character.id,
    name: character.name,
    abilityId: character.abilityId,
    stats: character.stats,
    wounds: character.wounds,
    owner: character.owner,
    archived: character.archived,
    inScene: character.inScene,
  };
}

export function parseSnapshot(value: unknown): TableSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.phase !== "lobby") return null;
  if (typeof value.revision !== "number" || typeof value.roomCode !== "string") return null;
  if (typeof value.campaignName !== "string" || typeof value.objective !== "string") return null;
  if (typeof value.playerCount !== "number") return null;
  if (!Array.isArray(value.characters)) return null;

  const characters: PublicCharacter[] = [];
  for (const entry of value.characters) {
    const character = parsePublicCharacter(entry);
    if (!character) return null;
    characters.push(character);
  }

  return {
    revision: value.revision,
    roomCode: value.roomCode,
    roomStatus: value.roomStatus === "closed" ? "closed" : "open",
    phase: "lobby",
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
    scene: typeof value.scene === "number" ? value.scene : 1,
    situation: typeof value.situation === "string" ? value.situation : "",
    characters,
    transcript: [],
    openCheck: null,
    intentQueue: [],
  };
}

function parsePublicCharacter(value: unknown): PublicCharacter | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  const ability = ABILITIES.find((entry) => entry.id === value.abilityId);
  if (!ability) return null;
  if (value.owner !== "host" && value.owner !== "peer") return null;
  if (!isRecord(value.stats)) return null;

  const might = readStat(value.stats.might);
  const finesse = readStat(value.stats.finesse);
  const wits = readStat(value.stats.wits);
  if (might === null || finesse === null || wits === null) return null;

  return {
    id: value.id,
    name: value.name,
    abilityId: ability.id,
    stats: { might, finesse, wits },
    wounds: readWounds(value.wounds),
    owner: value.owner,
    archived: value.archived === true,
    inScene: value.inScene !== false,
  };
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

function readStat(value: unknown): 0 | 1 | 2 | null {
  if (value === 0 || value === 1 || value === 2) return value;
  return null;
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
