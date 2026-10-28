import {
  checkAdjustments,
  equipmentAdjustments,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import type { TableCharacter } from "@/rpg/lib/character";
import type { SceneAction, TableState } from "@/rpg/lib/table";

const DIFFICULTIES = [8, 10, 12, 15] as const;
const FAILURES = ["setback", "harm", "severe"] as const;

/** Snap an arbitrary difficulty to the nearest legal scene/check difficulty (ties prefer the lower value). */
export function snapDifficulty(value: number): (typeof DIFFICULTIES)[number] {
  const n = Number.isFinite(value) ? Math.round(value) : DIFFICULTIES[0];
  if ((DIFFICULTIES as readonly number[]).includes(n)) {
    return n as (typeof DIFFICULTIES)[number];
  }
  let best: (typeof DIFFICULTIES)[number] = DIFFICULTIES[0];
  let bestDist = Math.abs(n - best);
  for (const entry of DIFFICULTIES) {
    const dist = Math.abs(n - entry);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best;
}

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

const ITEM_USE_STAT_PREFERENCE = [
  "intellect",
  "wits",
  "awareness",
  "empathy",
  "might",
  "finesse",
] as const;

export function isEquipmentItem(item: { slot: string }): boolean {
  return item.slot.length > 0;
}

export function inventoryUseActionId(itemId: string): string {
  return `use-${itemId.replace(/_/g, "-")}`;
}

function defaultItemUseStat(options: CharacterOptions): string {
  for (const id of ITEM_USE_STAT_PREFERENCE) {
    if (options.stats.some((stat) => stat.id === id)) return id;
  }
  return options.stats[0]?.id ?? "might";
}

/** Synthetic "Use …" actions for carried items that are not wearable equipment (empty slot). */
export function inventoryUseActions(
  characters: SceneActionActor[],
  options: CharacterOptions,
  difficulty: SceneAction["difficulty"],
  existing: SceneAction[],
): SceneAction[] {
  const existingIds = new Set(existing.map((action) => action.id));
  const existingItemIds = new Set(
    existing.flatMap((action) => (action.itemId ? [action.itemId] : [])),
  );
  const actions: SceneAction[] = [];

  for (const character of characters) {
    if (character.archived) continue;
    for (const item of character.inventory) {
      if (isEquipmentItem(item)) continue;
      if (existingItemIds.has(item.id)) continue;
      const id = inventoryUseActionId(item.id);
      if (existingIds.has(id)) continue;
      existingIds.add(id);
      actions.push({
        id,
        label: `Use ${item.name}`.slice(0, 72),
        stat: defaultItemUseStat(options),
        difficulty,
        failure: "setback",
        itemId: item.id,
      });
    }
  }

  return actions;
}

export function mergeAvailableActions(
  gmActions: SceneAction[],
  characters: SceneActionActor[],
  options: CharacterOptions,
  difficulty: SceneAction["difficulty"],
): SceneAction[] {
  return [...gmActions, ...inventoryUseActions(characters, options, difficulty, gmActions)];
}

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
    if (!parsed) {
      return { ok: false, error: "Each action needs a valid id, label, stat, difficulty, and failure." };
    }
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
  const difficulty = snapDifficulty(record.difficulty);
  if (!FAILURES.includes(record.failure as SceneActionFailure)) return null;

  const abilityId = readOptionalId(record.abilityId);
  const itemId = readOptionalId(record.itemId);
  const characterIds = readCharacterIds(record.characterIds);
  if (characterIds === null) return null;

  return {
    id,
    label,
    stat,
    difficulty,
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

const ACTION_ID_MAX = 32;
const ACTION_LABEL_MAX = 72;

/** Normalize LLM action rows before strict parse (id length, difficulty snap, label trim). */
export function repairSceneActionEntries(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const seen = new Set<string>();
  const repaired: unknown[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      repaired.push(entry);
      continue;
    }
    const record = entry as Record<string, unknown>;
    const rawId = typeof record.id === "string" ? record.id : "";
    const rawLabel = typeof record.label === "string" ? record.label : "";
    const id = uniqueActionId(rawId, rawLabel, seen);
    seen.add(id);
    const next: Record<string, unknown> = { ...record, id };
    if (typeof next.difficulty === "number") {
      next.difficulty = snapDifficulty(next.difficulty);
    }
    if (typeof next.label === "string") {
      const label = next.label.trim();
      if (label.length > ACTION_LABEL_MAX) next.label = label.slice(0, ACTION_LABEL_MAX);
    }
    repaired.push(next);
  }
  return repaired;
}

function uniqueActionId(rawId: string, label: string, seen: Set<string>): string {
  let base = fitActionId(slugActionId(rawId) || slugActionId(label) || "action");
  if (!seen.has(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = fitActionId(`${base.slice(0, Math.max(1, ACTION_ID_MAX - tail.length))}${tail}`);
    if (!seen.has(candidate)) return candidate;
  }
  return fitActionId(`action-${seen.size + 1}`);
}

function slugActionId(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (slug.length === 0) return "";
  if (!/^[a-z]/.test(slug)) return `a-${slug}`;
  return slug;
}

function fitActionId(id: string): string {
  let trimmed = id.slice(0, ACTION_ID_MAX).replace(/-+$/g, "");
  if (trimmed.length === 0) return "action";
  if (!/^[a-z]/.test(trimmed)) trimmed = fitActionId(`a-${trimmed}`);
  return trimmed;
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
