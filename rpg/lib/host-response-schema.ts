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
import actionsFragment from "@/rpg/schemas/fragments/actions.json";
import checkFragment from "@/rpg/schemas/fragments/check.json";
import encounterFragment from "@/rpg/schemas/fragments/encounter.json";
import gmBeatFragment from "@/rpg/schemas/fragments/gm-beat.json";
import itemFragment from "@/rpg/schemas/fragments/item.json";
import planIdFragment from "@/rpg/schemas/fragments/plan-id.json";
import campaignPlanFile from "@/rpg/schemas/campaign-plan.json";
import gmOutcomeFile from "@/rpg/schemas/gm-outcome.json";
import gmReactionFile from "@/rpg/schemas/gm-reaction.json";
import openingSituationFile from "@/rpg/schemas/opening-situation.json";
import sceneImageFile from "@/rpg/schemas/scene-image.json";
import startingLoadoutFile from "@/rpg/schemas/starting-loadout.json";

/** `$bind` inserts a runtime value. `$fragment` splices another schema file, then overlays sibling keys. */
const fragments: Record<string, unknown> = {
  actions: actionsFragment,
  check: checkFragment,
  encounter: encounterFragment,
  gmBeat: gmBeatFragment,
  item: itemFragment,
  planId: planIdFragment,
};

const sharedBinds = {
  locationMax: LOCATION_MAX,
  narrationMax: NARRATION_MAX,
  encounterNameMax: ENCOUNTER_NAME_MAX,
  encounterSummaryMax: ENCOUNTER_SUMMARY_MAX,
  setupMax: SETUP_MAX,
  xpMin: XP_AWARD_MIN,
  xpMax: XP_AWARD_MAX,
  planIdMax: PLAN_ID_MAX,
  planNameMax: PLAN_NAME_MAX,
  planSummaryMax: PLAN_SUMMARY_MAX,
  planLabelMax: PLAN_LABEL_MAX,
  planDetailMax: PLAN_DETAIL_MAX,
  situationEnum: { type: "string", enum: [...CHARACTER_SITUATIONS] },
} satisfies Record<string, unknown>;

export function openingSituationSchema(place: string): HostResponseSchema {
  return compile(openingSituationFile, {
    ...sharedBinds,
    place: { type: "string", const: place },
  });
}

export function campaignPlanSchema(bounds: PlanBounds): HostResponseSchema {
  return compile(campaignPlanFile, {
    ...sharedBinds,
    roomMin: bounds.roomMin,
    roomMax: bounds.roomMax,
    gateMin: bounds.gateMin,
    gateMax: bounds.gateMax,
  });
}

export function sceneImagePromptSchema(): HostResponseSchema {
  return compile(sceneImageFile, sharedBinds);
}

export function startingLoadoutSchema(table: TableState): HostResponseSchema {
  return compile(startingLoadoutFile, {
    ...sharedBinds,
    ...tableBinds(table, { actionMin: 2, actionMax: 4, allowProgress: false }),
  });
}

export function gmReactionSchema(table: TableState, actorId: string): HostResponseSchema {
  return compile(gmReactionFile, {
    ...sharedBinds,
    ...tableBinds(table, { actionMin: 2, actionMax: 4, allowProgress: true, actorId }),
  });
}

export function gmOutcomeSchema(table: TableState, checkSucceeded: boolean): HostResponseSchema {
  return compile(gmOutcomeFile, {
    ...sharedBinds,
    ...tableBinds(table, { actionMin: 2, actionMax: 4, allowProgress: checkSucceeded }),
  });
}

function compile(
  file: { name: string; properties: object },
  binds: Record<string, unknown>,
): HostResponseSchema {
  const properties = resolve(file.properties, binds);
  if (!isRecord(properties)) throw new Error(`Schema ${file.name} properties did not resolve to an object.`);
  return {
    name: file.name,
    schema: {
      type: "object",
      additionalProperties: false,
      properties,
      required: Object.keys(properties),
    },
  };
}

function resolve(node: unknown, binds: Record<string, unknown>): unknown {
  if (Array.isArray(node)) return node.map((entry) => resolve(entry, binds));
  if (!isRecord(node)) return node;

  if (typeof node.$bind === "string" && Object.keys(node).length === 1) {
    const value = binds[node.$bind];
    if (value === undefined) throw new Error(`Missing schema bind: ${node.$bind}`);
    return resolve(value, binds);
  }

  if (typeof node.$fragment === "string") {
    const source = fragments[node.$fragment];
    if (source === undefined) throw new Error(`Missing schema fragment: ${node.$fragment}`);
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key !== "$fragment") rest[key] = value;
    }
    const base = resolve(source, binds);
    if (Object.keys(rest).length === 0) return base;
    const overlay = resolve(rest, binds);
    if (isRecord(base) && isRecord(overlay)) return { ...base, ...overlay };
    return overlay;
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) resolved[key] = resolve(value, binds);
  return resolved;
}

function tableBinds(
  table: TableState,
  options: { actionMin: number; actionMax: number; allowProgress: boolean; actorId?: string },
): Record<string, unknown> {
  const stats = table.settings.characterOptions.stats.map((stat) => stat.id);
  const skills = table.settings.characterOptions.skills.map((skill) => skill.id);
  const living = table.characters.filter((character) => !character.archived).map((character) => character.id);
  const inScene = table.characters
    .filter((character) => !character.archived && character.inScene)
    .map((character) => character.id);
  const acting = table.characters
    .filter((character) => !character.archived && character.inScene && !character.wounds.includes("down"))
    .map((character) => character.id);
  const carried = table.characters.flatMap((character) =>
    character.archived ? [] : character.inventory.map((item) => item.id),
  );
  const limits = gmLootLimits(table.settings);
  const actorId = options.actorId ?? "";
  return {
    actionMin: options.actionMin,
    actionMax: options.actionMax,
    statEnum: stringEnum(stats),
    abilityEnum: stringEnum(["", ...skills]),
    modifierStatEnum: stringEnum(["", ...stats]),
    livingEnum: stringEnum(living),
    inSceneEnum: stringEnum(inScene),
    livingCount: living.length,
    characterIds:
      acting.length === 0
        ? { type: "array", maxItems: 0, items: { type: "string" } }
        : { type: "array", items: { type: "string", enum: unique(acting) } },
    itemIdEnum: stringEnum(["", ...carried]),
    currencyMax: limits.currencyMax,
    itemMax: limits.itemMax,
    actorId: actorId.length > 0 ? { type: "string", const: actorId } : { type: "string" },
    roomId: roomIdSchema(table.campaignPlan ?? null, options.allowProgress),
    clearedGateIds: clearedGateIdsSchema(table.campaignPlan ?? null, options.allowProgress),
  };
}

function roomIdSchema(plan: CampaignPlan | null, allowProgress: boolean): Record<string, unknown> {
  if (!plan) return { type: "string", const: "" };
  const current = plan.rooms.find((room) => room.id === plan.currentRoomId);
  if (!allowProgress) return { type: "string", enum: unique(["", ...(current ? [current.id] : [])]) };
  const exits = current ? current.exits : plan.rooms.map((room) => room.id);
  return { type: "string", enum: unique(["", ...(current ? [current.id] : []), ...exits]) };
}

function clearedGateIdsSchema(plan: CampaignPlan | null, allowProgress: boolean): Record<string, unknown> {
  const empty = { type: "array", maxItems: 0, items: { type: "string" } };
  if (!plan || !allowProgress) return empty;
  const pending = plan.gates
    .filter((gate) => gate.status === "pending" && gate.roomId === plan.currentRoomId)
    .map((gate) => gate.id);
  if (pending.length === 0) return empty;
  return { type: "array", maxItems: 1, items: { type: "string", enum: unique(pending) } };
}

function stringEnum(values: readonly string[]): Record<string, unknown> {
  const entries = unique(values);
  if (entries.length === 0) return { type: "string" };
  return { type: "string", enum: entries };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
