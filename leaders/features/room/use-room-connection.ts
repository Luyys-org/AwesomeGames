"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { setStoredRoomMembership } from "@/leaders/lib/room-storage";
import {
  ensureConnected,
  getServerSnapshot,
  getSnapshot,
  membershipFromConnection,
  RoomConnectionError,
  subscribe,
  type RoomConnectionPeer,
  type RoomLinkStatus,
} from "@/leaders/services/room-connection";
import type { RoomMembershipView, RoomRole } from "@/leaders/services/room.types";

interface RoomConnectionState {
  code: string;
  displayName: string;
  selfUsername: string;
  selfRole: RoomRole;
  linkStatus: RoomLinkStatus;
  failureReason: string | null;
  peers: RoomConnectionPeer[];
  connectionError: string | null;
  isLobbyLoading: boolean;
}

export function useRoomConnection(
  membership: RoomMembershipView,
  onMembershipChange?: (membership: RoomMembershipView) => void,
): RoomConnectionState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const roomCode = membership.code.toUpperCase();

  useEffect(() => {
    let cancelled = false;
    const current = getSnapshot();
    if (
      current &&
      current.code === roomCode &&
      current.selfRole === membership.role &&
      current.linkStatus !== "closed"
    ) {
      return;
    }

    ensureConnected(membership).catch((caught: unknown) => {
      if (cancelled) {
        return;
      }
      setConnectionError(
        caught instanceof RoomConnectionError
          ? caught.message
          : "Could not connect to the room.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [membership, roomCode]);

  useEffect(() => {
    if (!snapshot || snapshot.code !== roomCode) {
      return;
    }

    const next = membershipFromConnection(snapshot);
    setStoredRoomMembership(next);
    onMembershipChange?.(next);
  }, [onMembershipChange, roomCode, snapshot]);

  const matches =
    snapshot !== null && snapshot.code === membership.code.toUpperCase();

  const linkStatus: RoomLinkStatus = matches
    ? snapshot.linkStatus
    : connectionError
      ? "failed"
      : "signaling";

  const isLobbyLoading = !matches || linkStatus === "signaling";

  return {
    code: matches ? snapshot.code : membership.code,
    displayName: matches && snapshot.name ? snapshot.name : membership.name,
    selfUsername: matches ? snapshot.selfUsername : "",
    selfRole: matches ? snapshot.selfRole : membership.role,
    linkStatus,
    failureReason: matches ? snapshot.failureReason ?? connectionError : connectionError,
    peers: matches ? snapshot.peers : [],
    connectionError,
    isLobbyLoading,
  };
}
