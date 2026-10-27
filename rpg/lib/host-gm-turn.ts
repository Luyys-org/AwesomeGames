import {
  applyResolvedBeat,
  commitCheckBeat,
  markGmUnreadable,
  readGmOutcome,
  readGmReaction,
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

export async function runGmTurn(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  publishCheck: (table: TableState) => Promise<boolean>,
): Promise<TableState> {
  const reaction = await generateGmReaction(table, hostAi, intent);
  if (!reaction.ok) return markGmUnreadable(table, false);

  if (reaction.value.check) {
    const checked = commitCheckBeat(table, reaction.value, reaction.value.check, true);
    if (!checked.ok) return markGmUnreadable(table, false);
    const proceed = await publishCheck(checked.table);
    if (!proceed) return checked.table;
    const outcome = await generateGmOutcome(checked.table, hostAi, intent, checked.resolution);
    if (!outcome.ok) return markGmUnreadable(checked.table, false);
    const applied = applyResolvedBeat(checked.table, outcome.value, false);
    return applied.ok ? applied.table : markGmUnreadable(checked.table, false);
  }

  const applied = applyResolvedBeat(table, reaction.value, false);
  return applied.ok ? applied.table : markGmUnreadable(table, false);
}

async function generateGmReaction(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
): Promise<{ ok: true; value: GmReaction } | { ok: false; error: string }> {
  const first = await requestReaction(hostAi, buildGmReactionUserMessage(table, intent), table, intent);
  if (first.ok) return first;
  return requestReaction(hostAi, buildGmReactionRetryMessage(table, intent, first.error), table, intent);
}

async function generateGmOutcome(
  table: TableState,
  hostAi: HostAi,
  intent: GmIntent,
  resolution: Parameters<typeof buildGmOutcomeUserMessage>[2],
): Promise<{ ok: true; value: GmBeat } | { ok: false; error: string }> {
  const first = await requestOutcome(
    hostAi,
    buildGmOutcomeUserMessage(table, intent, resolution),
    table,
  );
  if (first.ok) return first;
  return requestOutcome(
    hostAi,
    buildGmOutcomeRetryMessage(table, intent, resolution, first.error),
    table,
  );
}

async function requestReaction(
  hostAi: HostAi,
  user: string,
  table: TableState,
  intent: GmIntent,
): Promise<{ ok: true; value: GmReaction } | { ok: false; error: string }> {
  const response = await callHostChat(hostAi, {
    temperature: 0.7,
    system: buildGmSystemPrompt(table.settings),
    user,
  });
  if (!response.ok) return response;
  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object." };
  return readGmReaction(parsed, table, intent.characterId);
}

async function requestOutcome(
  hostAi: HostAi,
  user: string,
  table: TableState,
): Promise<{ ok: true; value: GmBeat } | { ok: false; error: string }> {
  const response = await callHostChat(hostAi, {
    temperature: 0.7,
    system: buildGmSystemPrompt(table.settings),
    user,
  });
  if (!response.ok) return response;
  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object." };
  return readGmOutcome(parsed, table);
}
