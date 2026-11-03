import { currentPlanNodes, offeredPlanActions } from "@/rpg/lib/campaign-plan";
import {
  applyResolvedBeat,
  commitCheckBeat,
  formatGmFailureBody,
  markGmUnreadable,
  readGmOutcome,
  readGmReaction,
  NARRATION_MAX,
  repairGmOutcomePayload,
  repairGmReactionPayload,
  type GmBeat,
  type GmCheckProposal,
  type GmIntent,
  type GmReaction,
} from "@/rpg/lib/gm-turn";
import type { HostAi } from "@/rpg/lib/host-ai";
import {
  buildGmNarrationUserMessage,
  buildGmOutcomeUserMessage,
  buildGmReactionUserMessage,
  buildGmSystemPrompt,
} from "@/rpg/lib/host-gm-prompt";
import { callHostProse, parseJsonContent, truncateText, type HostTextDraft } from "@/rpg/lib/host-model-call";
import { gmNarrationSchema, gmOutcomeSchema, gmReactionSchema } from "@/rpg/lib/host-response-schema";
import { actionAbilityApplies } from "@/rpg/lib/scene-action";
import { planActionToSceneAction, resolveScriptedAction } from "@/rpg/lib/scripted-turn";
import type { TableState } from "@/rpg/lib/table";

export interface GmTurnResult {
  table: TableState;
  beat: GmBeat | null;
}

export async function runGmTurn(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  publishCheck: (table: TableState) => Promise<boolean>,
  draft?: HostTextDraft,
): Promise<GmTurnResult> {
  if (table.campaignPlan?.scripted) return runScriptedTurn(table, hostAi, intent, publishCheck, draft);
  const reaction = await generateGmReaction(table, hostAi, intent, draft);
  if (!reaction.ok) {
    return { table: markGmUnreadable(table, false, reaction.content), beat: null };
  }

  if (reaction.value.check) {
    const checked = commitCheckBeat(table, reaction.value, reaction.value.check, true);
    if (!checked.ok) {
      return {
        table: markGmUnreadable(table, false, formatGmFailureBody(checked.error, reaction.content)),
        beat: null,
      };
    }
    const proceed = await publishCheck(checked.table);
    if (!proceed) return { table: checked.table, beat: null };
    const outcome = await generateGmOutcome(checked.table, hostAi, intent, checked.resolution, draft);
    if (!outcome.ok) {
      return { table: markGmUnreadable(checked.table, false, outcome.content), beat: null };
    }
    const applied = applyResolvedBeat(checked.table, outcome.value, false);
    if (!applied.ok) {
      return {
        table: markGmUnreadable(
          checked.table,
          false,
          formatGmFailureBody(applied.error, outcome.content),
        ),
        beat: null,
      };
    }
    return { table: applied.table, beat: outcome.value };
  }

  const applied = applyResolvedBeat(table, reaction.value, false);
  if (!applied.ok) {
    return {
      table: markGmUnreadable(table, false, formatGmFailureBody(applied.error, reaction.content)),
      beat: null,
    };
  }
  return { table: applied.table, beat: reaction.value };
}

async function runScriptedTurn(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  publishCheck: (table: TableState) => Promise<boolean>,
  draft?: HostTextDraft,
): Promise<GmTurnResult> {
  const nodes = table.campaignPlan ? currentPlanNodes(table.campaignPlan) : null;
  if (!nodes) return { table: markGmUnreadable(table, false, "The campaign plan has no current place."), beat: null };

  if (intent.kind === "speak") {
    const facts = `${intent.characterName} said: ${intent.text}`;
    const prose = await narrate(hostAi, table, nodes.place.narration, nodes.scene.narration, facts, draft);
    return { table: withNarration(table, prose), beat: narrationBeat(prose, table.location.place) };
  }

  const actionId = intent.actionId ?? "";
  const action = offeredPlanActions(table.campaignPlan!).find((entry) => entry.id === actionId);
  if (!action) {
    return { table: markGmUnreadable(table, false, "That action is not in this room."), beat: null };
  }

  let rolling = table;
  let success = true;
  if (!action.certain) {
    const character = table.characters.find((entry) => entry.id === intent.characterId);
    const sceneAction = planActionToSceneAction(action);
    const check: GmCheckProposal = {
      characterId: intent.characterId,
      stat: action.stat,
      difficulty: action.difficulty,
      failure: action.effect === "encounter" ? "setback" : action.failure,
      abilityApplies: character
        ? actionAbilityApplies(character, table.settings.characterOptions, sceneAction)
        : false,
      setup: action.setup,
    };
    const encounter =
      action.effect === "encounter"
        ? nodes.place.encounters.find((entry) => entry.id === action.encounterId)
        : null;
    const checked = commitCheckBeat(
      table,
      {
        narration: action.setup,
        encounter: encounter ? { name: encounter.name, summary: encounter.summary } : null,
        place: "",
        weather: "",
        reputation: "",
        situations: [],
        loot: [],
        actions: [],
        progress: [],
        planUpdate: null,
      },
      check,
      true,
    );
    if (!checked.ok) return { table: markGmUnreadable(table, false, checked.error), beat: null };
    const proceed = await publishCheck(checked.table);
    if (!proceed) return { table: checked.table, beat: null };
    rolling = checked.table;
    success = checked.resolution.success;
  }

  const resolved = resolveScriptedAction(rolling, action.id, intent.characterId, success);
  if (!resolved.ok) return { table: markGmUnreadable(rolling, false, resolved.error), beat: null };
  const destination = resolved.table.campaignPlan ? currentPlanNodes(resolved.table.campaignPlan) : null;
  const prose = await narrate(
    hostAi,
    resolved.table,
    destination?.place.narration ?? nodes.place.narration,
    destination?.scene.narration ?? nodes.scene.narration,
    resolved.facts,
    draft,
  );
  const narrated = withNarration(resolved.table, prose);
  const fought =
    action.effect === "encounter"
      ? (nodes.place.encounters.find((entry) => entry.id === action.encounterId) ?? null)
      : null;
  return {
    table: narrated,
    beat: narrationBeat(
      prose,
      narrated.location.place,
      narrated.campaignPlan,
      fought ? { name: fought.name, summary: fought.summary } : null,
    ),
  };
}

async function narrate(
  hostAi: HostAi,
  table: TableState,
  roomNarration: string,
  sceneNarration: string,
  facts: string,
  draft?: HostTextDraft,
): Promise<string> {
  const response = await callHostProse(
    hostAi,
    {
      role: "gm",
      temperature: 0.7,
      system: buildGmSystemPrompt(table.settings),
      user: buildGmNarrationUserMessage({ settings: table.settings, roomNarration, sceneNarration, facts }),
      responseSchema: gmNarrationSchema(),
      textField: "narration",
    },
    draft,
  );
  if (!response.ok) return facts;
  const parsed = parseJsonContent(response.content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return facts;
  const narration = (parsed as Record<string, unknown>).narration;
  if (typeof narration !== "string" || narration.trim().length === 0) return facts;
  return truncateText(narration, NARRATION_MAX);
}

function withNarration(table: TableState, text: string): TableState {
  const narration = text.trim();
  if (!narration) return { ...table, gmBusy: false };
  return {
    ...table,
    revision: table.revision + 1,
    gmBusy: false,
    transcript: [...table.transcript, { type: "narration", text: truncateText(narration, NARRATION_MAX) }],
  };
}

function narrationBeat(
  narration: string,
  place: string,
  planUpdate: TableState["campaignPlan"] = null,
  encounter: GmBeat["encounter"] = null,
): GmBeat {
  return {
    narration,
    encounter,
    place,
    weather: "",
    reputation: "",
    situations: [],
    loot: [],
    actions: [],
    progress: [],
    planUpdate,
  };
}

async function generateGmReaction(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  draft?: HostTextDraft,
): Promise<GmGeneration<GmReaction>> {
  const reaction = await requestReaction(hostAi, buildGmReactionUserMessage(table, intent), table, intent, draft);
  if (reaction.ok) return reaction;
  return {
    ok: false,
    error: reaction.error,
    content: formatGmFailureBody(reaction.error, reaction.content),
  };
}

async function generateGmOutcome(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  resolution: Parameters<typeof buildGmOutcomeUserMessage>[2],
  draft?: HostTextDraft,
): Promise<GmGeneration<GmBeat>> {
  const outcome = await requestOutcome(
    hostAi,
    buildGmOutcomeUserMessage(table, intent, resolution),
    table,
    resolution.success,
    draft,
  );
  if (outcome.ok) return outcome;
  return {
    ok: false,
    error: outcome.error,
    content: formatGmFailureBody(outcome.error, outcome.content),
  };
}

async function requestReaction(
  hostAi: HostAi,
  user: string,
  table: TableState,
  intent: GmIntent,
  draft?: HostTextDraft,
): Promise<GmGeneration<GmReaction>> {
  const first = await completeReaction(hostAi, user, table, intent, draft);
  if (first.ok || !first.validation) return first;
  const second = await completeReaction(hostAi, `${user}\n\n${first.error}`, table, intent, draft);
  if (second.ok) return second;
  return { ok: false, error: second.error, content: preferModelContent(second, first) };
}

async function completeReaction(
  hostAi: HostAi,
  user: string,
  table: TableState,
  intent: GmIntent,
  draft?: HostTextDraft,
): Promise<GmAttempt<GmReaction>> {
  const response = await callHostProse(
    hostAi,
    {
      role: "gm",
      temperature: 0.7,
      system: buildGmSystemPrompt(table.settings),
      user,
      responseSchema: gmReactionSchema(table, intent.characterId),
      textField: "narration",
    },
    draft,
  );
  if (!response.ok) return { ok: false, error: response.error, content: response.error, validation: false };
  const parsed = parseJsonContent(response.content);
  if (parsed === null) {
    return { ok: false, error: "Response JSON must be an object.", content: response.content, validation: false };
  }
  const read = readGmReaction(repairGmReactionPayload(parsed, table, intent), table, intent);
  if (!read.ok) return { ok: false, error: read.error, content: response.content, validation: true };
  return { ok: true, value: read.value, content: response.content };
}

async function requestOutcome(
  hostAi: HostAi,
  user: string,
  table: TableState,
  checkSucceeded: boolean,
  draft?: HostTextDraft,
): Promise<GmGeneration<GmBeat>> {
  const first = await completeOutcome(hostAi, user, table, checkSucceeded, draft);
  if (first.ok || !first.validation) return first;
  const second = await completeOutcome(hostAi, `${user}\n\n${first.error}`, table, checkSucceeded, draft);
  if (second.ok) return second;
  return { ok: false, error: second.error, content: preferModelContent(second, first) };
}

async function completeOutcome(
  hostAi: HostAi,
  user: string,
  table: TableState,
  checkSucceeded: boolean,
  draft?: HostTextDraft,
): Promise<GmAttempt<GmBeat>> {
  const response = await callHostProse(
    hostAi,
    {
      role: "gm",
      temperature: 0.7,
      system: buildGmSystemPrompt(table.settings),
      user,
      responseSchema: gmOutcomeSchema(table, checkSucceeded),
      textField: "narration",
    },
    draft,
  );
  if (!response.ok) return { ok: false, error: response.error, content: response.error, validation: false };
  const parsed = parseJsonContent(response.content);
  if (parsed === null) {
    return { ok: false, error: "Response JSON must be an object.", content: response.content, validation: false };
  }
  const read = readGmOutcome(repairGmOutcomePayload(parsed), table, checkSucceeded);
  if (!read.ok) return { ok: false, error: read.error, content: response.content, validation: true };
  return { ok: true, value: read.value, content: response.content };
}

type GmGeneration<T> = { ok: true; value: T; content: string } | { ok: false; error: string; content: string };

type GmAttempt<T> = GmGeneration<T> & { validation?: boolean };

function preferModelContent(
  latest: { ok: false; error: string; content: string },
  earlier: { ok: false; error: string; content: string },
): string {
  if (latest.content !== latest.error) return latest.content;
  if (earlier.content !== earlier.error) return earlier.content;
  return latest.content;
}
