import { assignSceneRewards, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import { characterIdentity } from "@/rpg/lib/character-options";
import type { HostAi } from "@/rpg/lib/host-ai";
import { buildGmSystemPrompt, buildSceneRewardsUserMessage } from "@/rpg/lib/host-gm-prompt";
import { callHostChat, parseJsonContent } from "@/rpg/lib/host-model-call";
import { sceneRewardsSchema } from "@/rpg/lib/host-response-schema";
import { gmLootLimits } from "@/rpg/lib/gm-turn";
import type { TableState } from "@/rpg/lib/table";

export async function generateSceneRewards(
  table: TableState,
  hostAi: HostAi,
): Promise<{ ok: true; plan: CampaignPlan } | { ok: false; error: string }> {
  const plan = table.campaignPlan;
  if (!plan?.scripted) return { ok: false, error: "This campaign has no script." };
  const first = await requestRewards(table, hostAi, buildSceneRewardsUserMessage(rewardPrompt(table)));
  if (first.ok) return first;
  return requestRewards(
    table,
    hostAi,
    `${buildSceneRewardsUserMessage(rewardPrompt(table))}\n\n${first.error}`,
  );
}

function rewardPrompt(table: TableState) {
  const options = table.settings.characterOptions;
  const limits = gmLootLimits(table.settings);
  const plan = table.campaignPlan;
  return {
    settings: table.settings,
    currencyMax: limits.currencyMax,
    itemMax: limits.itemMax,
    characters: table.characters
      .filter((character) => !character.archived)
      .map((character) => {
        const identity = characterIdentity(character, options);
        return {
          characterId: character.id,
          name: character.name,
          classLabel: identity.className,
          raceLabel: identity.race,
          stats: options.stats.map((stat) => ({
            id: stat.id,
            label: stat.label,
            value: character.stats[stat.id] ?? 0,
          })),
        };
      }),
    scenes: (plan?.scenes ?? []).map((scene) => ({
      id: scene.id,
      name: scene.name,
      objective: scene.objective,
      narration: scene.narration,
      success: scene.success,
    })),
  };
}

async function requestRewards(
  table: TableState,
  hostAi: HostAi,
  user: string,
): Promise<{ ok: true; plan: CampaignPlan } | { ok: false; error: string }> {
  const plan = table.campaignPlan;
  if (!plan) return { ok: false, error: "This campaign has no script." };
  const response = await callHostChat(hostAi, {
    role: "plan",
    temperature: 0,
    maxTokens: 4096,
    system: buildGmSystemPrompt(table.settings),
    user,
    responseSchema: sceneRewardsSchema(table),
  });
  if (!response.ok) return response;
  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object." };
  const living = table.characters.filter((character) => !character.archived).map((character) => character.id);
  const limits = gmLootLimits(table.settings);
  const assigned = assignSceneRewards(plan, parsed, living, table.settings.characterOptions.stats, limits);
  if (!assigned.ok) return assigned;
  return { ok: true, plan: assigned.value };
}
