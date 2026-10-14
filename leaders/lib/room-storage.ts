import type { RoomMembershipView } from "@/leaders/services/room.types";

const ROOM_MEMBERSHIP_KEY = "dirigeant.roomMembership";

export function getStoredRoomMembership(): RoomMembershipView | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(ROOM_MEMBERSHIP_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RoomMembershipView;
  } catch {
    return null;
  }
}

export function setStoredRoomMembership(membership: RoomMembershipView): void {
  window.sessionStorage.setItem(ROOM_MEMBERSHIP_KEY, JSON.stringify(membership));
}

export function clearStoredRoomMembership(): void {
  window.sessionStorage.removeItem(ROOM_MEMBERSHIP_KEY);
}
