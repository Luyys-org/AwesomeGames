import type { RoomMembershipView } from "@/leaders/services/room.types";

export function isRoomGamePlayer(membership: RoomMembershipView | null): boolean {
  if (!membership) {
    return false;
  }

  return membership.role === "HOST" || membership.role === "GUEST";
}

export function membershipMatchesRoomCode(
  membership: RoomMembershipView | null,
  roomCode: string,
): boolean {
  if (!membership || !roomCode) {
    return false;
  }

  return membership.code.toUpperCase() === roomCode.toUpperCase();
}
