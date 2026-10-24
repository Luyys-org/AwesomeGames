import { createCharacterId, createClaimCode } from "@/rpg/lib/ids";

export type AbilityId =
  | "fighter"
  | "shooter"
  | "sneak"
  | "medic"
  | "scholar"
  | "face"
  | "pilot"
  | "tech";

export type StatName = "might" | "finesse" | "wits";

export type StatValue = 0 | 1 | 2;

export interface Stats {
  might: StatValue;
  finesse: StatValue;
  wits: StatValue;
}

export type Owner = "host" | "peer";

export type Wound = "hurt" | "impaired" | "down";

export interface CharacterDraft {
  name: string;
  abilityId: string;
  might: string;
  finesse: string;
  wits: string;
}

export interface TableCharacter {
  id: string;
  name: string;
  abilityId: AbilityId;
  stats: Stats;
  wounds: Wound[];
  claimCode: string;
  owner: Owner;
  archived: boolean;
  inScene: boolean;
}

export const ABILITIES: { id: AbilityId; label: string; stat: string; applies: string }[] = [
  { id: "fighter", label: "Fighter", stat: "Might", applies: "fight, break, lift, or endure" },
  { id: "shooter", label: "Shooter", stat: "Finesse", applies: "make a ranged attack or a precise shot" },
  { id: "sneak", label: "Sneak", stat: "Finesse", applies: "hide, sneak, or steal" },
  { id: "medic", label: "Medic", stat: "Wits", applies: "treat wounds or diagnose" },
  { id: "scholar", label: "Scholar", stat: "Wits", applies: "recall, research, or decipher" },
  { id: "face", label: "Face", stat: "Wits", applies: "persuade, deceive, or calm" },
  { id: "pilot", label: "Pilot", stat: "Finesse", applies: "drive, pilot, or navigate a vehicle" },
  { id: "tech", label: "Tech", stat: "Wits", applies: "use, repair, or bypass a machine" },
];

const NAME_PATTERN = /^[A-Za-z0-9 '\-]+$/;
const MAX_LIVING = 6;

export function abilityLabel(id: AbilityId): string {
  return ABILITIES.find((entry) => entry.id === id)?.label ?? id;
}

export function characterError(
  characters: { name: string; owner: Owner; archived: boolean }[],
  draft: CharacterDraft,
  owner: Owner,
): string | null {
  if (owner === "host" && characters.some((character) => character.owner === "host" && !character.archived)) {
    return "You already have a character.";
  }

  if (characters.filter((character) => !character.archived).length >= MAX_LIVING) {
    return "The table already has 6 characters.";
  }

  const name = readName(draft.name, characters);
  if (!name.ok) return name.error;

  if (!ABILITIES.some((entry) => entry.id === draft.abilityId)) return "Choose an ability.";

  const stats = readStats(draft);
  if (!stats.ok) return stats.error;

  return null;
}

export function addCharacter(
  characters: TableCharacter[],
  draft: CharacterDraft,
  owner: Owner,
): { ok: true; character: TableCharacter } | { ok: false; error: string } {
  const error = characterError(characters, draft, owner);
  if (error) return { ok: false, error };

  const name = readName(draft.name, characters);
  const ability = ABILITIES.find((entry) => entry.id === draft.abilityId);
  const stats = readStats(draft);
  if (!name.ok || !ability || !stats.ok) return { ok: false, error: "Choose an ability." };

  return {
    ok: true,
    character: {
      id: createCharacterId(),
      name: name.value,
      abilityId: ability.id,
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

function readStats(
  draft: CharacterDraft,
): { ok: true; value: Stats } | { ok: false; error: string } {
  const might = readStat(draft.might);
  const finesse = readStat(draft.finesse);
  const wits = readStat(draft.wits);
  if (might === null || finesse === null || wits === null) {
    return { ok: false, error: "Assign 2, 1, and 0 across Might, Finesse, and Wits." };
  }

  const sorted = [might, finesse, wits].sort((left, right) => left - right);
  if (sorted[0] !== 0 || sorted[1] !== 1 || sorted[2] !== 2) {
    return { ok: false, error: "Assign 2, 1, and 0 across Might, Finesse, and Wits." };
  }

  return { ok: true, value: { might, finesse, wits } };
}

function readStat(value: string): StatValue | null {
  if (value === "0" || value === "1" || value === "2") return Number(value) as StatValue;
  return null;
}
