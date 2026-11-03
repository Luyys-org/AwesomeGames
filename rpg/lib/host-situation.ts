import { planStartPlace, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { HostAi } from "@/rpg/lib/host-ai";
import {
  buildOpeningSituationUserMessage,
  buildGmSystemPrompt,
} from "@/rpg/lib/host-gm-prompt";
import { callHostProse, parseJsonContent, truncateText, type HostTextDraft } from "@/rpg/lib/host-model-call";
import { openingSituationSchema } from "@/rpg/lib/host-response-schema";
import type { SceneLocation } from "@/rpg/lib/table";

const SITUATION_MAX = 800;
const LOCATION_MAX = 80;

export interface OpeningScene {
  situation: string;
  location: SceneLocation;
}

export async function generateOpeningSituation(
  settings: CampaignSettings,
  hostAi: HostAi,
  plan: CampaignPlan,
  draft?: HostTextDraft,
): Promise<{ ok: true; situation: string; location: SceneLocation } | { ok: false; error: string }> {
  const startPlace = planStartPlace(plan);
  if (!startPlace) return { ok: false, error: "The campaign plan has no start place." };
  const situation = await requestSituation(
    hostAi,
    buildOpeningSituationUserMessage(settings, plan),
    settings,
    startPlace.name,
    draft,
  );
  if (situation.ok) return situation;
  return { ok: false, error: situation.error };
}

async function requestSituation(
  hostAi: HostAi,
  user: string,
  settings: CampaignSettings,
  startPlaceName: string,
  draft?: HostTextDraft,
): Promise<{ ok: true; situation: string; location: SceneLocation } | { ok: false; error: string }> {
  const response = await callHostProse(
    hostAi,
    {
      role: "gm",
      temperature: 0,
      system: buildGmSystemPrompt(settings),
      user,
      responseSchema: openingSituationSchema(startPlaceName),
      textField: "situation",
    },
    draft,
  );
  if (!response.ok) return response;

  const parsed = parseJsonContent(response.content);
  const situation = readSituation(parsed);
  if (!situation) {
    return { ok: false, error: "Response JSON must include a non-empty situation string." };
  }
  const location = readLocation(parsed);
  if (location.place.trim().toLowerCase() !== startPlaceName.trim().toLowerCase()) {
    return { ok: false, error: `Place must be the start place name: ${startPlaceName}.` };
  }
  return {
    ok: true,
    situation: truncateText(situation, SITUATION_MAX),
    location: { ...location, place: startPlaceName },
  };
}

function readSituation(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const situation = (value as Record<string, unknown>).situation;
  if (typeof situation !== "string") return null;
  const trimmed = situation.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readLocation(value: unknown): SceneLocation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { place: "", weather: "", reputation: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    place: readLocationLine(record.place),
    weather: readLocationLine(record.weather),
    reputation: readLocationLine(record.reputation),
  };
}

function readLocationLine(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  return truncateText(trimmed, LOCATION_MAX);
}
