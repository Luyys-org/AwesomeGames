import { roomExits, type CampaignPlan } from "@/rpg/lib/campaign-plan";
import type { HostAi } from "@/rpg/lib/host-ai";
import { callHostImage } from "@/rpg/lib/host-image";
import { callHostChat, parseJsonContent } from "@/rpg/lib/host-model-call";
import { roomMapSchema } from "@/rpg/lib/host-response-schema";
import { createRoomMapId } from "@/rpg/lib/ids";
import { renderTemplate } from "@/rpg/lib/prompt-template";
import {
  ROOM_MAP_FEATURES_MAX,
  ROOM_MAP_SHAPE_MAX,
  buildRoomMapImagePrompt,
  parseRoomMapPlan,
  type RoomMapDoor,
  type RoomMapPlan,
} from "@/rpg/lib/room-map";
import {
  base64ToDataUrl,
  compressSceneImageDataUrl,
  saveSceneImageDataUrl,
} from "@/rpg/lib/scene-image-store";
import type { TableState } from "@/rpg/lib/table";
import roomMapTemplate from "@/rpg/prompts/room-map";

const ROOM_MAP_SYSTEM = `You plan one room for a top-down map. Reply with JSON only.
Use only the exits in the user message. Each exit gets one door on a different wall: north, east, south, or west.
shape and features are single English lines and do not name player characters.
Do not add an exit.`;

export interface RoomMapReadyPayload {
  roomCode: string;
  placeId: string;
  imageId: string;
  doors: RoomMapDoor[];
  dataUrl: string;
}

export type RoomMapReadyListener = (payload: RoomMapReadyPayload) => void;

let readyListener: RoomMapReadyListener | null = null;
const generatingIds = new Set<string>();

export function isRoomMapGenerating(placeId: string | null | undefined): boolean {
  return typeof placeId === "string" && placeId.length > 0 && generatingIds.has(placeId);
}

export function registerRoomMapReadyListener(listener: RoomMapReadyListener | null): void {
  readyListener = listener;
}

export function queueRoomMapGeneration(
  roomCode: string,
  table: TableState,
  hostAi: HostAi,
  placeId: string,
): void {
  if (!placeId || generatingIds.has(placeId)) return;
  generatingIds.add(placeId);
  void runRoomMapGeneration(roomCode, table, hostAi, placeId);
}

async function runRoomMapGeneration(
  roomCode: string,
  table: TableState,
  hostAi: HostAi,
  placeId: string,
): Promise<void> {
  let imageId = "";
  let doors: RoomMapDoor[] = [];
  let dataUrl = "";
  try {
    const plan = table.campaignPlan;
    const here = currentPlace(plan);
    if (plan && here && plan.currentPlaceId === placeId) {
      const exits = roomExits(plan);
      const planned = await requestRoomPlan(hostAi, here, exits);
      if (planned.ok) {
        doors = planned.plan.doors;
        const image = await callHostImage(
          hostAi,
          buildRoomMapImagePrompt({
            universeType: table.settings.universeType,
            placeName: here.name,
            shape: planned.plan.shape,
            features: planned.plan.features,
            doors,
          }),
          "1:1",
        );
        if (image.ok) {
          imageId = createRoomMapId();
          dataUrl = await compressSceneImageDataUrl(base64ToDataUrl(image.b64, image.mime));
          await saveSceneImageDataUrl(imageId, dataUrl);
        }
      }
    }
  } catch {
    imageId = "";
    doors = [];
    dataUrl = "";
  } finally {
    generatingIds.delete(placeId);
  }

  readyListener?.({ roomCode, placeId, imageId, doors, dataUrl });
}

async function requestRoomPlan(
  hostAi: HostAi,
  here: { name: string; summary: string; sceneName: string },
  exits: ReturnType<typeof roomExits>,
): Promise<{ ok: true; plan: RoomMapPlan } | { ok: false; error: string }> {
  const user = renderTemplate(roomMapTemplate, {
    shapeMax: ROOM_MAP_SHAPE_MAX,
    featuresMax: ROOM_MAP_FEATURES_MAX,
    room: {
      scene: here.sceneName,
      place: here.name,
      summary: here.summary,
    },
    exits: exits.map((exit) => ({
      placeId: exit.placeId,
      name: exit.name,
      summary: exit.summary,
    })),
  });
  let note = "";
  let lastError = "The room plan was unreadable.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callHostChat(hostAi, {
      role: "plan",
      temperature: 0,
      maxTokens: 1024,
      system: ROOM_MAP_SYSTEM,
      user: note.length > 0 ? `${user}\n\n${note}` : user,
      responseSchema: roomMapSchema(exits.map((exit) => exit.placeId)),
    });
    if (!response.ok) return response;
    const parsed = parseRoomMapPlan(parseJsonContent(response.content), exits);
    if (parsed.ok) return { ok: true, plan: parsed.value };
    lastError = parsed.error;
    note = `The previous response was invalid: ${parsed.error} Return a corrected JSON object.`;
  }
  return { ok: false, error: lastError };
}

function currentPlace(
  plan: CampaignPlan | null,
): { name: string; summary: string; sceneName: string } | null {
  if (!plan) return null;
  const scene = plan.scenes.find((entry) => entry.id === plan.currentSceneId);
  const place = scene?.places.find((entry) => entry.id === plan.currentPlaceId);
  if (!scene || !place) return null;
  return { name: place.name, summary: place.summary, sceneName: scene.name };
}
