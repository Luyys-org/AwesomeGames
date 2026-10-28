import type { GmBeat } from "@/rpg/lib/gm-turn";
import { generateSceneImagePrompt } from "@/rpg/lib/host-image-prompt";
import { callHostImage, resolveImageModel } from "@/rpg/lib/host-image";
import type { HostAi } from "@/rpg/lib/host-ai";
import { createSceneImageId } from "@/rpg/lib/ids";
import {
  imageGenerationSupported,
  lastImageGmTurnAfterGeneration,
  shouldGenerateSceneImage,
  type SceneImageTriggerKind,
} from "@/rpg/lib/scene-image-policy";
import {
  base64ToDataUrl,
  compressSceneImageDataUrl,
  readSceneImageDataUrl,
  saveSceneImageDataUrl,
} from "@/rpg/lib/scene-image-store";
import type { SceneLocation, TableState } from "@/rpg/lib/table";

export interface SceneImageReadyPayload {
  roomCode: string;
  imageId: string;
  revision: number;
  dataUrl: string;
}

export type SceneImageReadyListener = (payload: SceneImageReadyPayload) => void;

let readyListener: SceneImageReadyListener | null = null;
const generatingIds = new Set<string>();

export function isSceneImageGenerating(imageId: string | null | undefined): boolean {
  return typeof imageId === "string" && generatingIds.has(imageId);
}

export function registerSceneImageReadyListener(listener: SceneImageReadyListener | null): void {
  readyListener = listener;
}

export function prepareSceneImageRequest(
  table: TableState,
  kind: SceneImageTriggerKind,
  hostAi: HostAi,
  beat?: GmBeat,
  locationBefore?: SceneLocation,
): TableState | null {
  if (!imageGenerationSupported(hostAi.provider) || !resolveImageModel(hostAi)) return null;
  if (
    !shouldGenerateSceneImage({
      kind,
      table,
      beat,
      locationBefore,
    })
  ) {
    return null;
  }

  const imageId = createSceneImageId();
  const revision = (table.sceneImageRevision ?? 0) + 1;
  const gmTurnCount = table.gmTurnCount ?? 0;

  return {
    ...table,
    imageBusy: true,
    sceneImageId: imageId,
    sceneImageRevision: revision,
    lastImageGmTurn: lastImageGmTurnAfterGeneration(kind, gmTurnCount),
  };
}

export function queueSceneImageGeneration(
  roomCode: string,
  table: TableState,
  hostAi: HostAi,
  beat?: GmBeat,
): void {
  void runSceneImageGeneration(roomCode, table, hostAi, beat);
}

export function startOpeningSceneImage(
  roomCode: string,
  table: TableState,
  hostAi: HostAi,
): TableState {
  const prepared = prepareSceneImageRequest(table, "opening", hostAi);
  if (!prepared) return table;
  queueSceneImageGeneration(roomCode, prepared, hostAi);
  return prepared;
}

async function runSceneImageGeneration(
  roomCode: string,
  table: TableState,
  hostAi: HostAi,
  beat?: GmBeat,
): Promise<void> {
  const imageId = table.sceneImageId;
  const revision = table.sceneImageRevision ?? 0;
  if (!imageId) return;

  generatingIds.add(imageId);
  try {
    const promptResult = await generateSceneImagePrompt(table, hostAi, beat);
    if (!promptResult.ok) {
      clearImageBusy(roomCode, table);
      return;
    }

    const imageResult = await callHostImage(hostAi, promptResult.prompt);
    if (!imageResult.ok) {
      clearImageBusy(roomCode, table);
      return;
    }

    let dataUrl = base64ToDataUrl(imageResult.b64, imageResult.mime);
    dataUrl = await compressSceneImageDataUrl(dataUrl);
    await saveSceneImageDataUrl(imageId, dataUrl);
    notifySceneImage(roomCode, imageId, revision, dataUrl);
  } catch {
    clearImageBusy(roomCode, table);
  } finally {
    generatingIds.delete(imageId);
  }
}

function clearImageBusy(roomCode: string, table: TableState): void {
  notifySceneImage(roomCode, table.sceneImageId ?? "", table.sceneImageRevision ?? 0, "");
}

function notifySceneImage(roomCode: string, imageId: string, revision: number, dataUrl: string): void {
  readyListener?.({ roomCode, imageId, revision, dataUrl });
}

export async function hydrateSceneImageUrl(
  table: TableState,
): Promise<{ id: string; dataUrl: string } | null> {
  const id = table.sceneImageId;
  if (!id) return null;
  const dataUrl = await readSceneImageDataUrl(id);
  if (!dataUrl) return null;
  return { id, dataUrl };
}
