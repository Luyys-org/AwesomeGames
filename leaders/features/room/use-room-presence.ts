"use client";

import { useSyncExternalStore } from "react";

import {
  guestJoinedFromMembers,
  participantUsernamesFromMembers,
} from "@/leaders/lib/room-participant-names";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/leaders/services/room-connection";
import type { RoomMemberView, RoomMembershipView } from "@/leaders/services/room.types";

export interface RoomPresenceState {
  guestJoined: boolean;
  hostReady: boolean;
  guestReady: boolean;
  members: RoomMemberView[];
  hostUsername: string | null;
  guestUsername: string | null;
  connectionStatus: "idle" | "connecting" | "connected" | "error";
}

function presenceFromMembership(membership: RoomMembershipView | null): RoomPresenceState {
  const members = membership?.members ?? [];
  const usernames = participantUsernamesFromMembers(members);
  return {
    guestJoined: guestJoinedFromMembers(members),
    hostReady: false,
    guestReady: false,
    members,
    hostUsername: usernames.hostUsername,
    guestUsername: usernames.guestUsername,
    connectionStatus: "connecting",
  };
}

export function useRoomPresence(membership: RoomMembershipView | null) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const matches = snapshot !== null && membership !== null && snapshot.code === membership.code.toUpperCase();
  const members = matches ? snapshot.members : membership?.members ?? [];
  const usernames = participantUsernamesFromMembers(members);
  const fallback = presenceFromMembership(membership);

  const connectionStatus: RoomPresenceState["connectionStatus"] = !matches
    ? fallback.connectionStatus
    : snapshot.linkStatus === "failed"
      ? "error"
      : snapshot.linkStatus === "open"
        ? "connected"
        : snapshot.linkStatus === "closed"
          ? "idle"
          : "connecting";

  const state: RoomPresenceState = {
    guestJoined: guestJoinedFromMembers(members),
    hostReady: matches ? snapshot.hostReady : false,
    guestReady: matches ? snapshot.guestReady : false,
    members,
    hostUsername: usernames.hostUsername,
    guestUsername: usernames.guestUsername,
    connectionStatus,
  };

  return {
    ...state,
    bothPlayersReady: state.hostReady && state.guestReady && state.guestJoined,
  };
}
