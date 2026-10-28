import { createClaimCode } from "@/rpg/lib/room-code";

export { createClaimCode };

function randomHexId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return `${prefix}${hex}`;
}

export function createCharacterId(): string {
  return randomHexId("pc_");
}

export function createItemId(): string {
  return randomHexId("itm_");
}

export function createSceneImageId(): string {
  return randomHexId("img_");
}
