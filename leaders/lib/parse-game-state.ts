import type { GameStateView } from "@/leaders/services/game.types";

export type GameCommandRejectionCode =
  | "ILLEGAL_MOVE"
  | "STALE_VERSION"
  | "GAME_NOT_FOUND"
  | "VALIDATION";

export interface GameCommandRejectionView {
  code: GameCommandRejectionCode;
  message: string;
  /** Present when {@link code} is `STALE_VERSION` (current server `games.version`). */
  actualVersion?: number;
}

const GAME_COMMAND_REJECTION_CODES = new Set<GameCommandRejectionCode>([
  "ILLEGAL_MOVE",
  "STALE_VERSION",
  "GAME_NOT_FOUND",
  "VALIDATION",
]);

export function parseGameStatePayload(body: string): GameStateView | null {
  try {
    const parsed = JSON.parse(body) as GameStateView;
    if (
      typeof parsed.version !== "number" ||
      typeof parsed.gameId !== "string" ||
      typeof parsed.activeColor !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseGameCommandRejectionPayload(body: string): GameCommandRejectionView | null {
  try {
    const parsed = JSON.parse(body) as GameCommandRejectionView;
    if (
      typeof parsed.message !== "string" ||
      parsed.message.length === 0 ||
      !GAME_COMMAND_REJECTION_CODES.has(parsed.code)
    ) {
      return null;
    }
    if (parsed.actualVersion !== undefined && typeof parsed.actualVersion !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
