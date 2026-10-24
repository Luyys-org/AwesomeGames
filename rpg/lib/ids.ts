import { createClaimCode } from "@/rpg/lib/room-code";

export { createClaimCode };

export function createCharacterId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return `pc_${hex}`;
}
