import type { TableCharacter, Wound } from "@/rpg/lib/character";

export const CHARACTER_SITUATIONS = [
  "standing",
  "sitting",
  "kneeling",
  "walking",
  "running",
  "sneaking",
  "crouching",
  "lying",
  "climbing",
  "swimming",
  "mounted",
  "flying",
  "grappled",
  "tied-up",
  "imprisoned",
  "hidden",
  "unconscious",
] as const;

export type CharacterSituation = (typeof CHARACTER_SITUATIONS)[number];

export const DEFAULT_CHARACTER_SITUATION: CharacterSituation = "standing";

export const CHARACTER_SITUATION_LIST = CHARACTER_SITUATIONS.join(", ");

const LABELS: Record<CharacterSituation, string> = {
  standing: "Standing",
  sitting: "Sitting",
  kneeling: "Kneeling",
  walking: "Walking",
  running: "Running",
  sneaking: "Sneaking",
  crouching: "Crouching",
  lying: "Lying",
  climbing: "Climbing",
  swimming: "Swimming",
  mounted: "Mounted",
  flying: "Flying",
  grappled: "Grappled",
  "tied-up": "Tied up",
  imprisoned: "Imprisoned",
  hidden: "Hidden",
  unconscious: "Unconscious",
};

export interface CharacterSituationChange {
  characterId: string;
  situation: CharacterSituation;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function isCharacterSituation(value: string): value is CharacterSituation {
  return (CHARACTER_SITUATIONS as readonly string[]).includes(value);
}

export function characterSituationLabel(situation: CharacterSituation): string {
  return LABELS[situation];
}

export function readStoredCharacterSituation(value: unknown): CharacterSituation {
  const parsed = situationToken(value);
  return parsed ?? DEFAULT_CHARACTER_SITUATION;
}

export function readCharacterSituations(
  value: unknown,
  characters: { id: string; name: string; archived: boolean; wounds: Wound[] }[],
): Parsed<CharacterSituationChange[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Situations must be an array." };

  const changes: CharacterSituationChange[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.characterId !== "string") {
      return { ok: false, error: "Each situation needs characterId and situation." };
    }
    const character = characters.find((candidate) => candidate.id === entry.characterId);
    if (!character || character.archived) {
      return { ok: false, error: "Situation can change only for a living character." };
    }
    if (seen.has(character.id)) {
      return { ok: false, error: "Each character can appear in situations only once." };
    }
    const situation = situationToken(entry.situation);
    if (!situation) {
      return { ok: false, error: `Situation must be one of: ${CHARACTER_SITUATION_LIST}.` };
    }
    if (character.wounds.includes("down") && situation !== "unconscious") {
      return { ok: false, error: `${character.name} is down and stays unconscious.` };
    }
    seen.add(character.id);
    changes.push({ characterId: character.id, situation });
  }
  return { ok: true, value: changes };
}

export function applyCharacterSituations(
  characters: TableCharacter[],
  changes: CharacterSituationChange[],
): TableCharacter[] {
  const byId = new Map(changes.map((change) => [change.characterId, change.situation]));
  return characters.map((character) => {
    const requested = byId.get(character.id);
    let situation = requested ?? readStoredCharacterSituation(character.situation);
    if (character.wounds.includes("down")) situation = "unconscious";
    if (situation === character.situation) return character;
    return { ...character, situation };
  });
}

function situationToken(value: unknown): CharacterSituation | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return isCharacterSituation(token) ? token : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
