import {
  applyResolvedBeat,
  commitCheckBeat,
  formatGmFailureBody,
  markGmUnreadable,
  readGmOutcome,
  readGmReaction,
  repairGmOutcomePayload,
  repairGmReactionPayload,
  type GmBeat,
  type GmIntent,
  type GmReaction,
} from "@/rpg/lib/gm-turn";
import type { HostAi } from "@/rpg/lib/host-ai";
import {
  buildGmOutcomeRetryMessage,
  buildGmOutcomeUserMessage,
  buildGmReactionRetryMessage,
  buildGmReactionUserMessage,
  buildGmSystemPrompt,
} from "@/rpg/lib/host-gm-prompt";
import { callHostChat, parseJsonContent } from "@/rpg/lib/host-model-call";
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
): Promise<GmTurnResult> {
  const reaction = await generateGmReaction(table, hostAi, intent);
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
    const outcome = await generateGmOutcome(checked.table, hostAi, intent, checked.resolution);
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

async function generateGmReaction(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
): Promise<GmGeneration<GmReaction>> {
  const first = await requestReaction(hostAi, buildGmReactionUserMessage(table, intent), table, intent);
  if (first.ok) return first;
  const second = await requestReaction(
    hostAi,
    buildGmReactionRetryMessage(table, intent, first.error),
    table,
    intent,
  );
  if (second.ok) return second;
  return {
    ok: false,
    error: second.error,
    content: formatGmFailureBody(second.error, preferModelContent(second, first)),
  };
}

async function generateGmOutcome(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  resolution: Parameters<typeof buildGmOutcomeUserMessage>[2],
): Promise<GmGeneration<GmBeat>> {
  const first = await requestOutcome(
    hostAi,
    buildGmOutcomeUserMessage(table, intent, resolution),
    table,
  );
  if (first.ok) return first;
  const second = await requestOutcome(
    hostAi,
    buildGmOutcomeRetryMessage(table, intent, resolution, first.error),
    table,
  );
  if (second.ok) return second;
  return {
    ok: false,
    error: second.error,
    content: formatGmFailureBody(second.error, preferModelContent(second, first)),
  };
}

async function requestReaction(
  hostAi: HostAi,
  user: string,
  table: TableState,
  intent: GmIntent,
): Promise<GmGeneration<GmReaction>> {
  const response = await callHostChat(hostAi, {
    temperature: 0.7,
    system: buildGmSystemPrompt(table.settings),
    user,
  });
  if (!response.ok) return { ok: false, error: response.error, content: response.error };
  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object.", content: response.content };
  const read = readGmReaction(repairGmReactionPayload(parsed, table, intent), table, intent);
  if (!read.ok) return { ok: false, error: read.error, content: response.content };
  return { ok: true, value: read.value, content: response.content };
}

async function requestOutcome(
  hostAi: HostAi,
  user: string,
  table: TableState,
): Promise<GmGeneration<GmBeat>> {
  const response = await callHostChat(hostAi, {
    temperature: 0.7,
    system: buildGmSystemPrompt(table.settings),
    user,
  });
  if (!response.ok) return { ok: false, error: response.error, content: response.error };
  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object.", content: response.content };
  const read = readGmOutcome(repairGmOutcomePayload(parsed), table);
  if (!read.ok) return { ok: false, error: read.error, content: response.content };
  return { ok: true, value: read.value, content: response.content };
}

type GmGeneration<T> = { ok: true; value: T; content: string } | { ok: false; error: string; content: string };

function preferModelContent(
  latest: { ok: false; error: string; content: string },
  earlier: { ok: false; error: string; content: string },
): string {
  if (latest.content !== latest.error) return latest.content;
  if (earlier.content !== earlier.error) return earlier.content;
  return latest.content;
}
