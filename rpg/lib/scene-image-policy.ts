import type { GmBeat } from "@/rpg/lib/gm-turn";
import type { AiProvider } from "@/rpg/lib/host-ai";
import type { SceneLocation, TableState } from "@/rpg/lib/table";

export const SCENE_IMAGE_COOLDOWN_TURNS = 5;

export type SceneImageTriggerKind = "opening" | "beat";

export interface SceneImagePolicyInput {
  kind: SceneImageTriggerKind;
  table: TableState;
  beat?: GmBeat;
  locationBefore?: SceneLocation;
}

export function imageGenerationSupported(provider: AiProvider): boolean {
  return provider === "openai" || provider === "grok";
}

function normalizePlace(value: string): string {
  return value.trim().toLowerCase();
}

export function beatIsVisuallySignificant(
  beat: GmBeat,
  locationBefore: SceneLocation,
): boolean {
  if (beat.encounter !== null) return true;
  if (beat.place.trim().length > 0) {
    const next = normalizePlace(beat.place);
    const prev = normalizePlace(locationBefore.place);
    if (next.length > 0 && next !== prev) return true;
  }
  return false;
}

export function shouldGenerateSceneImage(input: SceneImagePolicyInput): boolean {
  if (input.kind === "opening") return true;
  if (!input.beat || !input.locationBefore) return false;
  if (!beatIsVisuallySignificant(input.beat, input.locationBefore)) return false;

  const gmTurnCount = input.table.gmTurnCount ?? 0;
  const lastImageGmTurn = input.table.lastImageGmTurn ?? -1;
  if (lastImageGmTurn < 0) return true;
  return gmTurnCount - lastImageGmTurn >= SCENE_IMAGE_COOLDOWN_TURNS;
}

export function lastImageGmTurnAfterGeneration(
  kind: SceneImageTriggerKind,
  gmTurnCount: number,
): number {
  return kind === "opening" ? 0 : gmTurnCount;
}
