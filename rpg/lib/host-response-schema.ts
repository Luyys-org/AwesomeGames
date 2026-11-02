import {
  PLAN_DETAIL_MAX,
  PLAN_ID_MAX,
  PLAN_LABEL_MAX,
  PLAN_NAME_MAX,
  PLAN_SUMMARY_MAX,
  type CampaignPlan,
  type PlanBounds,
} from "@/rpg/lib/campaign-plan";
import { CHARACTER_SITUATIONS } from "@/rpg/lib/character-situation";
import {
  ENCOUNTER_NAME_MAX,
  ENCOUNTER_SUMMARY_MAX,
  LOCATION_MAX,
  NARRATION_MAX,
  SETUP_MAX,
  gmLootLimits,
} from "@/rpg/lib/gm-turn";
import type { HostResponseSchema } from "@/rpg/lib/host-model-call";
import { XP_AWARD_MAX, XP_AWARD_MIN } from "@/rpg/lib/progression";
import type { TableState } from "@/rpg/lib/table";

const DIFFICULTIES = [8, 10, 12, 15] as const;
const FAILURES = ["setback", "harm", "severe"] as const;
const PLAN_ID_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*";
const ACTION_ID_PATTERN = "[a-z][a-z0-9-]{0,31}";
const SLOT_PATTERN = "[a-z][a-z0-9-]{0,23}";

type JsonSchema = Record<string, unknown>;

export function openingSituationSchema(place: string): HostResponseSchema {
  return named("opening_situation", {
    situation: text(1, 800),
    place: { type: "string", const: place },
    weather: line(1, LOCATION_MAX),
    reputation: line(1, LOCATION_MAX),
  });
}

export function campaignPlanSchema(bounds: PlanBounds): HostResponseSchema {
  const id = { type: "string", minLength: 1, maxLength: PLAN_ID_MAX, pattern: PLAN_ID_PATTERN };
  return named("campaign_plan", {
    rooms: {
      type: "array",
      minItems: bounds.roomMin,
      maxItems: bounds.roomMax,
      items: objectSchema({
        id,
        name: line(1, PLAN_NAME_MAX),
        summary: line(1, PLAN_SUMMARY_MAX),
        exits: { type: "array", items: id },
        role: { type: "string", enum: ["start", "path", "finale"] },
      }),
    },
    gates: {
      type: "array",
      minItems: bounds.gateMin,
      maxItems: bounds.gateMax,
      items: objectSchema({
        id,
        roomId: id,
        kind: { type: "string", enum: ["lock", "boss", "obstacle", "clue"] },
        label: line(1, PLAN_LABEL_MAX),
        detail: line(1, PLAN_DETAIL_MAX),
      }),
    },
  });
}

export function sceneImagePromptSchema(): HostResponseSchema {
  return named("scene_image_prompt", {
    prompt: text(1, 1000),
  });
}

export function startingLoadoutSchema(table: TableState): HostResponseSchema {
  const stats = statIds(table);
  const living = livingIds(table);
  return named("starting_loadout", {
    kits: {
      type: "array",
      minItems: living.length,
      maxItems: living.length,
      items: objectSchema({
        characterId: stringEnum(living),
        currency: { type: "integer", minimum: 0 },
        inventory: { type: "array", items: itemSchema(stats) },
      }),
    },
    actions: actionArray(table, 3, 8),
  });
}

export function gmReactionSchema(table: TableState, actorId: string): HostResponseSchema {
  return named("gm_reaction", {
    ...beatFields(table, true),
    check: nullable(checkSchema(actorId, statIds(table))),
  });
}

export function gmOutcomeSchema(table: TableState, checkSucceeded: boolean): HostResponseSchema {
  const fields = beatFields(table, checkSucceeded);
  return named("gm_outcome", {
    ...fields,
    narration: { type: "string", minLength: 1, maxLength: NARRATION_MAX },
    actions: actionArray(table, 3, 8),
  });
}

function beatFields(table: TableState, allowProgress: boolean): Record<string, JsonSchema> {
  const stats = statIds(table);
  const limits = gmLootLimits(table.settings);
  const living = livingIds(table);
  const inScene = table.characters
    .filter((character) => !character.archived && character.inScene)
    .map((character) => character.id);
  return {
    narration: { type: "string", maxLength: NARRATION_MAX },
    encounter: nullable(
      objectSchema({
        name: line(1, ENCOUNTER_NAME_MAX),
        summary: line(1, ENCOUNTER_SUMMARY_MAX),
      }),
    ),
    place: { type: "string", maxLength: LOCATION_MAX },
    weather: { type: "string", maxLength: LOCATION_MAX },
    reputation: { type: "string", maxLength: LOCATION_MAX },
    situations: {
      type: "array",
      maxItems: Math.max(living.length, 0),
      items: objectSchema({
        characterId: stringEnum(living),
        situation: { type: "string", enum: [...CHARACTER_SITUATIONS] },
      }),
    },
    loot: {
      type: "array",
      items: objectSchema({
        characterId: stringEnum(inScene),
        currency: { type: "integer", minimum: 0, maximum: limits.currencyMax },
        items: {
          type: "array",
          maxItems: limits.itemMax,
          items: itemSchema(stats),
        },
      }),
    },
    actions: actionArray(table, 0, 8),
    progress: {
      type: "array",
      items: objectSchema({
        characterId: stringEnum(living),
        xp: { type: "integer", minimum: XP_AWARD_MIN, maximum: XP_AWARD_MAX },
      }),
    },
    roomId: roomIdSchema(table.campaignPlan ?? null, allowProgress),
    clearedGateIds: clearedGateIdsSchema(table.campaignPlan ?? null, allowProgress),
  };
}

function checkSchema(actorId: string, stats: string[]): JsonSchema {
  return objectSchema({
    characterId: actorId.length > 0 ? { type: "string", const: actorId } : { type: "string" },
    stat: stringEnum(stats),
    difficulty: { type: "integer", enum: [...DIFFICULTIES] },
    failure: { type: "string", enum: [...FAILURES] },
    abilityApplies: { type: "boolean" },
    setup: line(1, SETUP_MAX),
  });
}

function actionArray(table: TableState, minItems: number, maxItems: number): JsonSchema {
  const acting = table.characters
    .filter((character) => !character.archived && character.inScene && !character.wounds.includes("down"))
    .map((character) => character.id);
  const carried = table.characters.flatMap((character) =>
    character.archived ? [] : character.inventory.map((item) => item.id),
  );
  return {
    type: "array",
    minItems,
    maxItems,
    items: objectSchema({
      id: { type: "string", minLength: 1, maxLength: 32, pattern: ACTION_ID_PATTERN },
      label: line(1, 72),
      stat: stringEnum(statIds(table)),
      difficulty: { type: "integer", enum: [...DIFFICULTIES] },
      failure: { type: "string", enum: [...FAILURES] },
      abilityId: stringEnum(["", ...skillIds(table)]),
      characterIds:
        acting.length === 0
          ? { type: "array", maxItems: 0, items: { type: "string" } }
          : { type: "array", items: { type: "string", enum: unique(acting) } },
      itemId: stringEnum(["", ...carried]),
    }),
  };
}

function itemSchema(stats: string[]): JsonSchema {
  return objectSchema({
    name: line(1, 80),
    slot: {
      anyOf: [
        { type: "string", const: "" },
        { type: "string", minLength: 1, maxLength: 24, pattern: SLOT_PATTERN },
      ],
    },
    equipped: { type: "boolean" },
    modifiers: {
      type: "array",
      maxItems: 4,
      items: objectSchema({
        kind: { type: "string", enum: ["stat", "roll"] },
        statId: stringEnum(["", ...stats]),
        amount: {
          anyOf: [
            { type: "integer", minimum: -3, maximum: -1 },
            { type: "integer", minimum: 1, maximum: 3 },
          ],
        },
      }),
    },
  });
}

function roomIdSchema(plan: CampaignPlan | null, allowProgress: boolean): JsonSchema {
  if (!plan) return { type: "string", const: "" };
  const current = plan.rooms.find((room) => room.id === plan.currentRoomId);
  if (!allowProgress) {
    return { type: "string", enum: unique(["", ...(current ? [current.id] : [])]) };
  }
  const exits = current ? current.exits : plan.rooms.map((room) => room.id);
  return { type: "string", enum: unique(["", ...(current ? [current.id] : []), ...exits]) };
}

function clearedGateIdsSchema(plan: CampaignPlan | null, allowProgress: boolean): JsonSchema {
  const empty: JsonSchema = { type: "array", maxItems: 0, items: { type: "string" } };
  if (!plan || !allowProgress) return empty;
  const pending = plan.gates
    .filter((gate) => gate.status === "pending" && gate.roomId === plan.currentRoomId)
    .map((gate) => gate.id);
  if (pending.length === 0) return empty;
  return { type: "array", maxItems: 1, items: { type: "string", enum: unique(pending) } };
}

function named(name: string, properties: Record<string, JsonSchema>): HostResponseSchema {
  return { name, schema: objectSchema(properties) };
}

function objectSchema(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

function nullable(schema: JsonSchema): JsonSchema {
  return { anyOf: [{ type: "null" }, schema] };
}

function text(minLength: number, maxLength: number): JsonSchema {
  return { type: "string", minLength, maxLength };
}

function line(minLength: number, maxLength: number): JsonSchema {
  return { ...text(minLength, maxLength), pattern: "[^\\r\\n]+" };
}

function stringEnum(values: readonly string[]): JsonSchema {
  const entries = unique(values);
  if (entries.length === 0) return { type: "string" };
  return { type: "string", enum: entries };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function livingIds(table: TableState): string[] {
  return table.characters.filter((character) => !character.archived).map((character) => character.id);
}

function statIds(table: TableState): string[] {
  return table.settings.characterOptions.stats.map((stat) => stat.id);
}

function skillIds(table: TableState): string[] {
  return table.settings.characterOptions.skills.map((skill) => skill.id);
}
