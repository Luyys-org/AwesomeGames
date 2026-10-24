import {
  readAssignedStats,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import { createCharacterId, createClaimCode } from "@/rpg/lib/ids";

export type Owner = "host" | "peer";

export type Wound = "hurt" | "impaired" | "down";

export interface CharacterDraft {
  name: string;
  abilityId: string;
  classId: string;
  raceId: string;
  stats: Record<string, string>;
}

export interface TableCharacter {
  id: string;
  name: string;
  abilityId: string;
  classId: string;
  raceId: string;
  stats: Record<string, number>;
  wounds: Wound[];
  claimCode: string;
  owner: Owner;
  archived: boolean;
  inScene: boolean;
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

  const stats = readAssignedStats(options, draft.stats);
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
  const stats = readAssignedStats(options, draft.stats);
  if (!name.ok || !ability || !stats.ok) return { ok: false, error: "Choose a skill." };

  return {
    ok: true,
    character: {
      id: createCharacterId(),
      name: name.value,
      abilityId: ability.id,
      classId: options.classes.some((entry) => entry.id === draft.classId) ? draft.classId : "",
      raceId: options.races.some((entry) => entry.id === draft.raceId) ? draft.raceId : "",
      stats: stats.value,
      wounds: [],
      claimCode: createClaimCode(),
      owner,
      archived: false,
      inScene: true,
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

