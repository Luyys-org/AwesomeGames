"use client";

import { useCallback, useState } from "react";

import { RoomConnectionError, setRoomSeat } from "@/leaders/services/room-connection";
import type { RoomMembershipView, RoomRole } from "@/leaders/services/room.types";

export function useRoomSeat(membership: RoomMembershipView, guestJoined: boolean) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const playerSlotTaken =
    guestJoined &&
    membership.role !== "GUEST" &&
    membership.role !== "HOST";

  const chooseSeat = useCallback(
    async (desired: "GUEST" | "SPECTATOR") => {
      if (membership.role === "HOST") {
        return;
      }
      const current: RoomRole = membership.role;
      if (current === desired) {
        return;
      }
      if (desired === "GUEST" && playerSlotTaken) {
        setError("The player seat is already taken.");
        return;
      }

      setIsPending(true);
      setError(null);
      try {
        await setRoomSeat(desired);
      } catch (caught) {
        setError(
          caught instanceof RoomConnectionError
            ? caught.message
            : "Could not update your seat.",
        );
      } finally {
        setIsPending(false);
      }
    },
    [membership.role, playerSlotTaken],
  );

  return {
    error,
    isPending,
    playerSlotTaken,
    chooseSeat,
  };
}
