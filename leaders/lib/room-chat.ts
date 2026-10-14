import type { RoomRole } from "@/leaders/services/room.types";

export function formatRoomRole(role: RoomRole): string {
  if (role === "HOST") {
    return "Player 1 (host)";
  }
  if (role === "GUEST") {
    return "Player 2";
  }
  return "Spectator";
}

export type PlayerLobbyLabelSuffixKind = "you" | "username" | "waiting";

export interface PlayerLobbyLabelParts {
  base: string;
  suffix: string | null;
  suffixKind: PlayerLobbyLabelSuffixKind | null;
}

export function getPlayerLobbyLabelParts(options: {
  slot: 1 | 2;
  viewerRole: RoomRole;
  hostUsername: string | null;
  guestUsername: string | null;
  guestJoined: boolean;
}): PlayerLobbyLabelParts {
  const { slot, viewerRole, hostUsername, guestUsername, guestJoined } = options;
  const base = slot === 1 ? "Player 1" : "Player 2";
  const slotRole: RoomRole = slot === 1 ? "HOST" : "GUEST";

  if (slot === 2 && !guestJoined) {
    return { base, suffix: "not joined", suffixKind: "waiting" };
  }

  if (viewerRole === slotRole) {
    return { base, suffix: "you", suffixKind: "you" };
  }

  const username = slot === 1 ? hostUsername : guestUsername;
  if (username) {
    return { base, suffix: username, suffixKind: "username" };
  }

  return { base, suffix: null, suffixKind: null };
}
