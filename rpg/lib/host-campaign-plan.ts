import { planBounds, parseGeneratedPlan, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { HostAi } from "@/rpg/lib/host-ai";
import { buildGmSystemPrompt, serializeCampaignForGm } from "@/rpg/lib/host-gm-prompt";
import { gmLanguageLabel } from "@/rpg/lib/campaign-tab-config";
import { callHostChat, parseJsonContent } from "@/rpg/lib/host-model-call";
import { renderTemplate } from "@/rpg/lib/prompt-template";
import campaignPlanTemplate from "@/rpg/prompts/campaign-plan";

export async function generateCampaignPlan(
  settings: CampaignSettings,
  hostAi: HostAi,
): Promise<{ ok: true; plan: CampaignPlan } | { ok: false; error: string }> {
  const plan = await requestPlan(hostAi, settings, buildPlanMessage(settings));
  if (plan.ok) return plan;
  return { ok: false, error: "The campaign plan could not be generated." };
}

function buildPlanMessage(settings: CampaignSettings): string {
  return renderTemplate(campaignPlanTemplate, planVars(settings));
}

function planVars(settings: CampaignSettings): Record<string, unknown> {
  return {
    bounds: planBounds(settings.enemyDifficulty),
    campaign: serializeCampaignForGm(settings),
    language: gmLanguageLabel(settings.campaignConfiguration?.language),
  };
}

async function requestPlan(
  hostAi: HostAi,
  settings: CampaignSettings,
  user: string,
): Promise<{ ok: true; plan: CampaignPlan } | { ok: false; error: string }> {
  const response = await callHostChat(hostAi, {
    temperature: 0,
    maxTokens: 4096,
    system: buildGmSystemPrompt(settings),
    user,
  });
  if (!response.ok) return response;

  const parsed = parseJsonContent(response.content);
  if (parsed === null) return { ok: false, error: "Response JSON must be an object." };
  const plan = parseGeneratedPlan(parsed, settings);
  if (!plan.ok) return plan;
  return { ok: true, plan: plan.value };
}
