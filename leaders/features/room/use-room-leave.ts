"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { clearStoredRoomMembership } from "@/leaders/lib/room-storage";
import { leadersPaths } from "@/leaders/paths";
import { leaveRoom, RoomConnectionError } from "@/leaders/services/room-connection";
import type { RoomMembershipView } from "@/leaders/services/room.types";

export function useRoomLeave(membership: RoomMembershipView | null) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const exitToPlay = useCallback(async () => {
    setLeaveError(null);

    if (!membership) {
      router.push(leadersPaths.home);
      return;
    }

    setIsLeaving(true);
    try {
      await leaveRoom();
      clearStoredRoomMembership();
      router.push(leadersPaths.home);
    } catch (caught) {
      if (caught instanceof RoomConnectionError) {
        setLeaveError(caught.message);
      } else {
        setLeaveError("Could not leave the room.");
      }
    } finally {
      setIsLeaving(false);
    }
  }, [membership, router]);

  return {
    exitToPlay,
    isLeaving,
    leaveError,
  };
}
