import { openingSituationFromPlan, planStartPlace } from "@/rpg/lib/campaign-plan";
import { readHostAi } from "@/rpg/lib/host-ai";
import { generateCampaignPlan } from "@/rpg/lib/host-campaign-plan";
import { readHostSession, writeHostSession } from "@/rpg/lib/host-session";
import { startOpeningSceneImage } from "@/rpg/lib/host-scene-image";
import type { HostTextDraft } from "@/rpg/lib/host-model-call";
import { generateOpeningSituation } from "@/rpg/lib/host-situation";
import {
  applyCampaignOpening,
  campaignOpeningReady,
  type CampaignOpening,
} from "@/rpg/lib/table";

export type CampaignPrepStatus = "idle" | "pending" | "ready" | "failed";

export interface CampaignPrepState {
  status: CampaignPrepStatus;
  error: string | null;
}

const IDLE_PREP: CampaignPrepState = { status: "idle", error: null };

type PrepApplier = (roomCode: string, opening: CampaignOpening) => boolean;

const jobs = new Set<string>();
const states = new Map<string, CampaignPrepState>();
const openings = new Map<string, CampaignOpening>();
const listeners = new Set<() => void>();
let applier: PrepApplier | null = null;

export interface OpeningDraft {
  start: (roomCode: string) => void;
  text: (roomCode: string, value: string) => void;
  flush: (roomCode: string) => Promise<void>;
}

let openingDraft: OpeningDraft | null = null;

export function installOpeningDraft(handler: OpeningDraft): void {
  openingDraft = handler;
}

export function installCampaignPrepApplier(apply: PrepApplier): void {
  applier = apply;
}

export function campaignPrepState(roomCode: string): CampaignPrepState {
  return states.get(roomCode) ?? IDLE_PREP;
}

export function serverCampaignPrepState(): CampaignPrepState {
  return IDLE_PREP;
}

export function preparedCampaignOpening(roomCode: string): CampaignOpening | null {
  return openings.get(roomCode) ?? null;
}

export function subscribeCampaignPrep(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function scheduleCampaignPreparation(roomCode: string): void {
  if (jobs.has(roomCode)) return;
  if (states.get(roomCode)?.status === "ready") return;

  jobs.add(roomCode);
  setPrep(roomCode, { status: "pending", error: null });
  void runCampaignPreparation(roomCode).finally(() => {
    jobs.delete(roomCode);
  });
}

async function runCampaignPreparation(roomCode: string): Promise<void> {
  try {
    const saved = readHostSession();
    if (!saved || saved.roomCode !== roomCode) {
      failPrep(roomCode, "This browser does not have the host game.");
      return;
    }
    if (campaignOpeningReady(saved.table)) {
      setPrep(roomCode, { status: "ready", error: null });
      return;
    }

    const hostAi = readHostAi();
    if (!hostAi) {
      failPrep(roomCode, "Link an AI provider before you create a game.");
      return;
    }

    const planResult = await generateCampaignPlan(saved.table.settings, hostAi);
    if (!planResult.ok) {
      failPrep(roomCode, planResult.error);
      return;
    }
    const start = planStartPlace(planResult.plan);
    if (!start) {
      failPrep(roomCode, "The campaign plan has no start place.");
      return;
    }

    const scriptedOpening = openingSituationFromPlan(planResult.plan);
    const situationResult = await generateOpeningSituation(
      saved.table.settings,
      hostAi,
      planResult.plan,
      openingDraftFor(roomCode),
    );
    const situation = situationResult.ok ? situationResult.situation : scriptedOpening;
    if (!situation.trim()) {
      failPrep(roomCode, situationResult.ok ? "The opening situation was empty." : situationResult.error);
      return;
    }

    const opening: CampaignOpening = {
      plan: planResult.plan,
      situation,
      location: situationResult.ok
        ? situationResult.location
        : { place: start.name, weather: "", reputation: "" },
    };
    if (!deliverCampaignOpening(roomCode, opening)) {
      failPrep(roomCode, "The campaign opening could not be saved.");
      return;
    }
    setPrep(roomCode, { status: "ready", error: null });
  } catch {
    failPrep(roomCode, "The campaign could not be prepared.");
  }
}

function deliverCampaignOpening(roomCode: string, opening: CampaignOpening): boolean {
  openings.set(roomCode, opening);
  if (applier?.(roomCode, opening)) return true;
  return mergeOpeningIntoStoredSession(roomCode, opening);
}

function mergeOpeningIntoStoredSession(roomCode: string, opening: CampaignOpening): boolean {
  const saved = readHostSession();
  if (!saved || saved.roomCode !== roomCode) return false;
  if (saved.table.phase !== "lobby") return saved.table.campaignPlan !== null;
  if (saved.table.campaignPlan) return true;

  const merged = applyCampaignOpening(saved.table, opening);
  if (!merged) return false;
  const hostAi = readHostAi();
  const table = hostAi ? startOpeningSceneImage(roomCode, merged, hostAi) : merged;
  writeHostSession({ roomCode, table });
  return true;
}

function openingDraftFor(roomCode: string): HostTextDraft | undefined {
  if (!openingDraft) return undefined;
  return {
    start: () => openingDraft?.start(roomCode),
    text: (value) => openingDraft?.text(roomCode, value),
    flush: () => openingDraft?.flush(roomCode) ?? Promise.resolve(),
  };
}

function failPrep(roomCode: string, error: string): void {
  setPrep(roomCode, { status: "failed", error });
}

function setPrep(roomCode: string, state: CampaignPrepState): void {
  states.set(roomCode, state);
  for (const listener of listeners) listener();
}
