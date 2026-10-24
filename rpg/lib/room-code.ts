export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const CLAIM_CODE_LENGTH = 4;

const ALPHABET_SIZE = ROOM_CODE_ALPHABET.length;
const REJECT_AT = Math.floor(2 ** 32 / ALPHABET_SIZE) * ALPHABET_SIZE;

export function isRoomCode(value: string): boolean {
  return isCode(value, ROOM_CODE_LENGTH);
}

export function isClaimCode(value: string): boolean {
  return isCode(value, CLAIM_CODE_LENGTH);
}

export function createRoomCode(): string {
  return drawCode(ROOM_CODE_LENGTH);
}

export function createClaimCode(): string {
  return drawCode(CLAIM_CODE_LENGTH);
}

function isCode(value: string, length: number): boolean {
  if (value.length !== length) return false;

  for (const character of value) {
    if (!ROOM_CODE_ALPHABET.includes(character)) return false;
  }

  return true;
}

function drawCode(length: number): string {
  const buffer = new Uint32Array(1);
  let code = "";

  while (code.length < length) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value >= REJECT_AT) continue;
    code += ROOM_CODE_ALPHABET[value % ALPHABET_SIZE];
  }

  return code;
}
