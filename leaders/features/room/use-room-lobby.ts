"use client";

import { useCallback, useState } from "react";

import { RoomConnectionError, setRoomReady } from "@/leaders/services/room-connection";
import type { RoomMembershipView } from "@/leaders/services/room.types";

interface UseRoomLobbyOptions {
  membership: RoomMembershipView;
  guestJoined: boolean;
  hostReady: boolean;
  guestReady: boolean;
}

export function useRoomLobby({
  membership,
  guestJoined,
  hostReady,
  guestReady,
}: UseRoomLobbyOptions) {
  const [error, setError] = useState<string | null>(null);
  const [isReadyPending, setIsReadyPending] = useState(false);

  const isPlayer = membership.role === "HOST" || membership.role === "GUEST";
  const canMarkReady = isPlayer && guestJoined && membership.status === "LOBBY";
  const selfReady = membership.role === "HOST"
    ? hostReady
    : membership.role === "GUEST"
      ? guestReady
      : false;

  const toggleReady = useCallback(async () => {
    if (!canMarkReady) {
      return;
    }

    setIsReadyPending(true);
    setError(null);
    try {
      await setRoomReady(!selfReady);
    } catch (caught) {
      setError(
        caught instanceof RoomConnectionError
          ? caught.message
          : "Could not update ready status.",
      );
    } finally {
      setIsReadyPending(false);
    }
  }, [canMarkReady, selfReady]);

  return {
    isPlayer,
    canMarkReady,
    selfReady,
    error,
    isReadyPending,
    toggleReady,
  };
}
