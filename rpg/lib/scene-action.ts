import {
  checkAdjustments,
  equipmentAdjustments,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import type { TableCharacter } from "@/rpg/lib/character";
import type { SceneAction, TableState } from "@/rpg/lib/table";

const DIFFICULTIES = [8, 10, 12, 15] as const;
const FAILURES = ["setback", "harm", "severe"] as const;

export type SceneActionFailure = (typeof FAILURES)[number];

export interface ActionCheckPreview {
  statLabel: string;
  statId: string;
  difficulty: number;
  failure: SceneActionFailure;
  modifierBeforeRoll: number;
  abilityApplies: boolean;
  abilityLabel: string | null;
}

export type SceneActionActor = Pick<
  TableCharacter,
  "id" | "archived" | "inScene" | "wounds" | "inventory"
>;

export function findItemOwnerId(characters: SceneActionActor[], itemId: string): string | null {
  for (const character of characters) {
    if (character.inventory.some((item) => item.id === itemId)) return character.id;
  }
  return null;
}

export function canPerformSceneAction(
  character: SceneActionActor,
  action: SceneAction,
  characters: SceneActionActor[],
): boolean {
  if (character.archived || !character.inScene || character.wounds.includes("down")) return false;
  if (action.itemId) {
    const ownerId = findItemOwnerId(characters, action.itemId);
    if (ownerId !== character.id) return false;
  }
  if (action.characterIds && action.characterIds.length > 0) {
    return action.characterIds.includes(character.id);
  }
  return true;
}

export function sceneActionsForCharacter(
  character: SceneActionActor,
  actions: SceneAction[],
  characters: SceneActionActor[],
): SceneAction[] {
  return actions.filter((action) => canPerformSceneAction(character, action, characters));
}

export function actionAbilityApplies(
  character: Pick<TableCharacter, "abilityId" | "extraAbilityId">,
  options: CharacterOptions,
  action: SceneAction,
): boolean {
  if (!action.abilityId) return false;
  const skill = options.skills.find((entry) => entry.id === action.abilityId);
  if (!skill || skill.statId !== action.stat) return false;
  return character.abilityId === action.abilityId || character.extraAbilityId === action.abilityId;
}

export function actionCheckPreview(
  character: Pick<
    TableCharacter,
    "abilityId" | "extraAbilityId" | "classId" | "raceId" | "raceStatIds" | "stats" | "wounds" | "inventory"
  >,
  action: SceneAction,
  options: CharacterOptions,
): ActionCheckPreview {
  const stat = options.stats.find((entry) => entry.id === action.stat);
  const assigned = character.stats[action.stat] ?? 0;
  const adjustments = checkAdjustments(
    options,
    character.classId,
    character.raceId,
    action.stat,
    character.raceStatIds ?? [],
  );
  const gear = equipmentAdjustments(character.inventory, action.stat);
  const abilityApplies = actionAbilityApplies(character, options, action);
  const ability = abilityApplies ? 2 : 0;
  const impaired = character.wounds.includes("impaired") ? 2 : 0;
  const modifierBeforeRoll =
    assigned + adjustments.stat + gear.stat + adjustments.roll + gear.roll + ability - impaired;
  let abilityLabel: string | null = null;
  if (abilityApplies && action.abilityId) {
    abilityLabel = options.skills.find((entry) => entry.id === action.abilityId)?.label ?? null;
  }
  return {
    statLabel: stat?.label ?? action.stat,
    statId: action.stat,
    difficulty: action.difficulty,
    failure: action.failure,
    modifierBeforeRoll,
    abilityApplies,
    abilityLabel,
  };
}

export function failureLabel(failure: SceneActionFailure): string {
  if (failure === "setback") return "setback on failure";
  if (failure === "harm") return "harm on failure";
  return "severe on failure";
}

export function validateSceneActions(
  value: unknown,
  table: TableState,
): { ok: true; value: SceneAction[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "Actions must be an array." };
  const options = table.settings.characterOptions;
  const living = table.characters.filter((character) => !character.archived && character.inScene);
  const eligible = living.filter((character) => !character.wounds.includes("down"));
  const eligibleIds = new Set(eligible.map((character) => character.id));
  const actions: SceneAction[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const parsed = parseSceneActionEntry(entry);
    if (!parsed) continue;
    if (seen.has(parsed.id)) return { ok: false, error: "Action ids must be unique." };
    seen.add(parsed.id);
    if (!options.stats.some((stat) => stat.id === parsed.stat)) {
      return { ok: false, error: `Action ${parsed.id} uses an unknown stat.` };
    }
    if (parsed.abilityId && !options.skills.some((skill) => skill.id === parsed.abilityId)) {
      return { ok: false, error: `Action ${parsed.id} uses an unknown abilityId.` };
    }
    if (parsed.abilityId) {
      const skill = options.skills.find((item) => item.id === parsed.abilityId);
      if (skill && skill.statId !== parsed.stat) {
        return { ok: false, error: `Action ${parsed.id} abilityId must match the action stat.` };
      }
    }
    let characterIds = parsed.characterIds;
    if (parsed.itemId) {
      const ownerId = findItemOwnerId(table.characters, parsed.itemId);
      if (!ownerId) return { ok: false, error: `Action ${parsed.id} itemId is not on any character.` };
      if (!eligibleIds.has(ownerId)) {
        return { ok: false, error: `Action ${parsed.id} item owner cannot act right now.` };
      }
      if (characterIds && characterIds.length > 0 && !characterIds.includes(ownerId)) {
        return { ok: false, error: `Action ${parsed.id} characterIds must include the item owner.` };
      }
      characterIds = [ownerId];
    }
    if (characterIds && characterIds.length > 0) {
      for (const id of characterIds) {
        if (!eligibleIds.has(id)) {
          return { ok: false, error: `Action ${parsed.id} lists a character who cannot act.` };
        }
      }
    }
    actions.push({
      ...parsed,
      ...(characterIds && characterIds.length > 0 ? { characterIds } : {}),
    });
  }

  return { ok: true, value: actions };
}

function parseSceneActionEntry(value: unknown): SceneAction | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.label !== "string") return null;
  if (typeof record.stat !== "string" || typeof record.failure !== "string") return null;
  if (typeof record.difficulty !== "number") return null;
  const id = record.id.trim();
  const label = record.label.trim();
  const stat = record.stat.trim();
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(id)) return null;
  if (label.length === 0 || label.length > 72) return null;
  if (!DIFFICULTIES.includes(record.difficulty as (typeof DIFFICULTIES)[number])) return null;
  if (!FAILURES.includes(record.failure as SceneActionFailure)) return null;

  const abilityId = readOptionalId(record.abilityId);
  const itemId = readOptionalId(record.itemId);
  const characterIds = readCharacterIds(record.characterIds);
  if (characterIds === null) return null;

  return {
    id,
    label,
    stat,
    difficulty: record.difficulty as SceneAction["difficulty"],
    failure: record.failure as SceneActionFailure,
    ...(abilityId ? { abilityId } : {}),
    ...(itemId ? { itemId } : {}),
    ...(characterIds.length > 0 ? { characterIds } : {}),
  };
}

function readOptionalId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readCharacterIds(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) return null;
    ids.push(entry.trim());
  }
  return ids;
}

export function parseSceneActions(value: unknown): SceneAction[] {
  if (!Array.isArray(value)) return [];
  const actions: SceneAction[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const parsed = parseSceneActionEntry(entry);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    actions.push(parsed);
  }
  return actions;
}
