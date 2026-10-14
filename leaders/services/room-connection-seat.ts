import type { RoomRole } from "@/leaders/services/room.types";

export const MAX_SPECTATORS = 4;
export const MAX_REMOTE_PEERS = MAX_SPECTATORS + 1;

export const HOST_TAKEN = "This room already has a host.";
export const GUEST_TAKEN = "This room already has a player.";
export const ROOM_FULL = "This room is full.";

const SEAT_REASONS = [HOST_TAKEN, GUEST_TAKEN, ROOM_FULL] as const;

export interface SeatIntro {
  role: RoomRole;
  username: string;
  roomName: string;
  openedAt: number;
}

export interface SeatOccupancy {
  guestCount: number;
  spectatorCount: number;
}

export type SeatDecision = { ok: true } | { ok: false; reason: string };

export function seatRejectionReason(message: string): string | null {
  return SEAT_REASONS.find((reason) => message.includes(reason)) ?? null;
}

/** Host-side accept or reject for a peer that is not itself a host. */
export function decideSeat(remote: SeatIntro, occupancy: SeatOccupancy): SeatDecision {
  if (remote.role === "HOST") {
    return { ok: false, reason: HOST_TAKEN };
  }

  if (remote.role === "GUEST") {
    if (occupancy.guestCount >= 1) {
      return { ok: false, reason: GUEST_TAKEN };
    }
    return { ok: true };
  }

  if (occupancy.spectatorCount >= MAX_SPECTATORS) {
    return { ok: false, reason: ROOM_FULL };
  }

  return { ok: true };
}
