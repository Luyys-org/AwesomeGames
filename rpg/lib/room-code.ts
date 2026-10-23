export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export function isRoomCode(value: string): boolean {
  if (value.length !== ROOM_CODE_LENGTH) return false;

  for (const character of value) {
    if (!ROOM_CODE_ALPHABET.includes(character)) return false;
  }

  return true;
}
