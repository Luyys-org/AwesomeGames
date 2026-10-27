import {
  readAssignedStats,
  type CharacterOptions,
  type ItemModifier,
} from "@/rpg/lib/character-options";
import { createCharacterId, createClaimCode } from "@/rpg/lib/ids";

export type Owner = "host" | "peer";

export type Wound = "hurt" | "impaired" | "down";

export interface InventoryItem {
  id: string;
  name: string;
  slot: string;
  equipped: boolean;
  modifiers: ItemModifier[];
}

export const WOUND_HP_MAX = 3;

export function characterHp(wounds: Wound[]): { current: number; max: number } {
  if (wounds.includes("down")) return { current: 0, max: WOUND_HP_MAX };
  return { current: WOUND_HP_MAX - wounds.length, max: WOUND_HP_MAX };
}

export interface CharacterDraft {
  name: string;
  abilityId: string;
  extraAbilityId: string;
  classId: string;
  raceId: string;
  raceStatIds: string[];
  stats: Record<string, string>;
}

export interface TableCharacter {
  id: string;
  name: string;
  abilityId: string;
  extraAbilityId: string;
  classId: string;
  raceId: string;
  raceStatIds: string[];
  stats: Record<string, number>;
  wounds: Wound[];
  claimCode: string;
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

const NAME_PATTERN = /^[A-Za-z0-9 '\-]+$/;
const MAX_LIVING = 6;

export function abilityLabel(id: string, options?: CharacterOptions): string {
  return options?.skills.find((entry) => entry.id === id)?.label ?? id;
}

export function characterError(
  characters: { name: string; owner: Owner; archived: boolean }[],
  draft: CharacterDraft,
  owner: Owner,
  options: CharacterOptions,
): string | null {
  if (owner === "host" && characters.some((character) => character.owner === "host" && !character.archived)) {
    return "You already have a character.";
  }

  if (characters.filter((character) => !character.archived).length >= MAX_LIVING) {
    return "The table already has 6 characters.";
  }

  const name = readName(draft.name, characters);
  if (!name.ok) return name.error;

  if (!options.skills.some((entry) => entry.id === draft.abilityId)) return "Choose a skill.";
  if (options.classes.length > 0 && !options.classes.some((entry) => entry.id === draft.classId)) {
    return "Choose a class.";
  }
  if (options.races.length > 0 && !options.races.some((entry) => entry.id === draft.raceId)) {
    return "Choose a race.";
  }
  const racePicks = readRacePicks(options, draft.raceId, draft.abilityId, draft.extraAbilityId, draft.raceStatIds);
  if (!racePicks.ok) return racePicks.error;

  const stats = readAssignedStats(options, draft.stats, draft.classId);
  if (!stats.ok) return stats.error;

  return null;
}

export function addCharacter(
  characters: TableCharacter[],
  draft: CharacterDraft,
  owner: Owner,
  options: CharacterOptions,
): { ok: true; character: TableCharacter } | { ok: false; error: string } {
  const error = characterError(characters, draft, owner, options);
  if (error) return { ok: false, error };

  const name = readName(draft.name, characters);
  const ability = options.skills.find((entry) => entry.id === draft.abilityId);
  const racePicks = readRacePicks(options, draft.raceId, draft.abilityId, draft.extraAbilityId, draft.raceStatIds);
  const stats = readAssignedStats(options, draft.stats, draft.classId);
  if (!name.ok || !ability || !racePicks.ok || !stats.ok) return { ok: false, error: "Choose a skill." };

  return {
    ok: true,
    character: {
      id: createCharacterId(),
      name: name.value,
      abilityId: ability.id,
      extraAbilityId: racePicks.extraAbilityId,
      classId: options.classes.some((entry) => entry.id === draft.classId) ? draft.classId : "",
      raceId: options.races.some((entry) => entry.id === draft.raceId) ? draft.raceId : "",
      raceStatIds: racePicks.raceStatIds,
      stats: stats.value,
      wounds: [],
      claimCode: createClaimCode(),
      owner,
      archived: false,
      inScene: true,
      ready: false,
      currency: 0,
      inventory: [],
      level: 1,
      xp: 0,
      pendingRewards: 0,
    },
  };
}

export function findClaim(
  characters: TableCharacter[],
  name: string,
  claimCode: string,
): TableCharacter | null {
  const trimmed = name.trim().toLowerCase();
  return (
    characters.find(
      (character) => character.name.toLowerCase() === trimmed && character.claimCode === claimCode,
    ) ?? null
  );
}

export function storedRacePicks(
  options: CharacterOptions,
  raceId: string,
  abilityId: string,
  extraAbilityId: unknown,
  raceStatIds: unknown,
): { ok: true; extraAbilityId: string; raceStatIds: string[] } | { ok: false; error: string } {
  const extra = extraAbilityId === undefined ? "" : extraAbilityId;
  const chosen = raceStatIds === undefined ? [] : raceStatIds;
  if (typeof extra !== "string" || !Array.isArray(chosen) || chosen.length > 2) {
    return { ok: false, error: "Choose a race." };
  }
  if (chosen.some((entry) => typeof entry !== "string")) {
    return { ok: false, error: "Choose two different stats." };
  }
  return readRacePicks(options, raceId, abilityId, extra, chosen);
}

export function readRacePicks(
  options: CharacterOptions,
  raceId: string,
  abilityId: string,
  extraAbilityId: string,
  raceStatIds: string[],
): { ok: true; extraAbilityId: string; raceStatIds: string[] } | { ok: false; error: string } {
  const race = options.races.find((entry) => entry.id === raceId);
  const choices = race?.statChoices ?? 0;
  const extra = race?.extraSkills ?? 0;
  const unique = new Set(raceStatIds);

  if (raceStatIds.length !== choices || unique.size !== choices) {
    return { ok: false, error: choices > 0 ? "Choose two different stats." : "That race does not choose stats." };
  }
  if (raceStatIds.some((id) => !options.stats.some((stat) => stat.id === id))) {
    return { ok: false, error: "Choose two different stats." };
  }
  if (extra === 0) {
    if (extraAbilityId.length > 0) return { ok: false, error: "That race does not gain a skill." };
    return { ok: true, extraAbilityId: "", raceStatIds };
  }
  if (!options.skills.some((entry) => entry.id === extraAbilityId)) {
    return { ok: false, error: "Choose a second skill." };
  }
  if (extraAbilityId === abilityId) return { ok: false, error: "Choose a different second skill." };
  return { ok: true, extraAbilityId, raceStatIds };
}

function readName(
  value: string,
  characters: { name: string }[],
): { ok: true; value: string } | { ok: false; error: string } {
  const name = value.trim();
  if (name.length === 0) return { ok: false, error: "Enter a name." };
  if (name.length > 24) return { ok: false, error: "Name must be 24 characters or fewer." };
  if (!NAME_PATTERN.test(name)) {
    return {
      ok: false,
      error: "Name can use letters, numbers, spaces, apostrophes, and hyphens.",
    };
  }

  const taken = characters.some((character) => character.name.toLowerCase() === name.toLowerCase());
  if (taken) return { ok: false, error: "That name is already taken." };

  return { ok: true, value: name };
}

