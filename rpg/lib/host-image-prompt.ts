import { gmLanguageLabel } from "@/rpg/lib/campaign-tab-config";
import { characterSituationLabel, readStoredCharacterSituation } from "@/rpg/lib/character-situation";
import type { GmBeat } from "@/rpg/lib/gm-turn";
import { buildGmSystemPrompt, serializeCampaignForGm } from "@/rpg/lib/host-gm-prompt";
import { callHostChat, parseJsonContent, truncateText } from "@/rpg/lib/host-model-call";
import type { HostAi } from "@/rpg/lib/host-ai";
import { renderTemplate } from "@/rpg/lib/prompt-template";
import sceneImageTemplate from "@/rpg/prompts/scene-image";
import type { TableState, TranscriptEntry } from "@/rpg/lib/table";

const PROMPT_MAX = 1000;

function recentNarration(transcript: TranscriptEntry[], limit = 2): string[] {
  const lines: string[] = [];
  for (let index = transcript.length - 1; index >= 0 && lines.length < limit; index -= 1) {
    const entry = transcript[index];
    if (entry?.type === "narration") lines.unshift(entry.text);
  }
  return lines;
}

export function buildSceneImageUserMessage(
  table: TableState,
  beat?: GmBeat,
): string {
  const settings = table.settings;
  return renderTemplate(sceneImageTemplate, {
    campaign: serializeCampaignForGm(settings),
    language: gmLanguageLabel(settings.campaignConfiguration?.language),
    context: {
      situation: table.situation.slice(0, 800),
      place: table.location.place,
      weather: table.location.weather,
      reputation: table.location.reputation,
      scene: table.scene,
      postures: table.characters
        .filter((character) => !character.archived && character.inScene)
        .map((character) => characterSituationLabel(readStoredCharacterSituation(character.situation))),
      recentNarration: recentNarration(table.transcript),
      encounter: beat?.encounter ?? null,
    },
  });
}

export async function generateSceneImagePrompt(
  table: TableState,
  hostAi: HostAi,
  beat?: GmBeat,
): Promise<{ ok: true; prompt: string } | { ok: false; error: string }> {
  const response = await callHostChat(hostAi, {
    temperature: 0,
    system: buildGmSystemPrompt(table.settings),
    user: buildSceneImageUserMessage(table, beat),
  });
  if (!response.ok) return response;

  const parsed = parseJsonContent(response.content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Response JSON must include a prompt string." };
  }
  const prompt = (parsed as Record<string, unknown>).prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return { ok: false, error: "Response JSON must include a non-empty prompt string." };
  }
  return { ok: true, prompt: truncateText(prompt, PROMPT_MAX) };
}
