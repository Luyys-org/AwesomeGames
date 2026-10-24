import { isRoomCode } from "@/rpg/lib/room-code";
import type { TableState } from "@/rpg/lib/table";

const HOST_SESSION_KEY = "rpg.host.session";

export interface HostSession {
  roomCode: string;
  table: TableState;
}

export function readHostSession(): HostSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(HOST_SESSION_KEY);
    if (!raw) return null;
    return parseHostSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeHostSession(session: HostSession): void {
  window.sessionStorage.setItem(HOST_SESSION_KEY, JSON.stringify(session));
}

function parseHostSession(value: unknown): HostSession | null {
  if (!isRecord(value) || !isRecord(value.table)) return null;
  if (typeof value.roomCode !== "string" || !isRoomCode(value.roomCode)) return null;
  if (value.table.roomCode !== value.roomCode) return null;
  if (value.table.phase !== "waiting" && value.table.phase !== "lobby") return null;
  if (!Array.isArray(value.table.characters)) return null;
  if (!isRecord(value.table.settings) || typeof value.table.settings.campaignName !== "string") {
    return null;
  }

  return { roomCode: value.roomCode, table: value.table as unknown as TableState };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
