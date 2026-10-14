"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useRoomLeave } from "@/leaders/features/room/use-room-leave";
import { leadersPaths } from "@/leaders/paths";
import { setStoredRoomMembership } from "@/leaders/lib/room-storage";
import { requestRoomReplay, RoomConnectionError } from "@/leaders/services/room-connection";
import type { RoomMembershipView } from "@/leaders/services/room.types";

export function useGameEndActions(membership: RoomMembershipView | null) {
  const router = useRouter();
  const roomLeave = useRoomLeave(membership);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);

  const replay = useCallback(async () => {
    if (!membership) {
      return;
    }

    setReplayError(null);
    setIsReplaying(true);
    try {
      await requestRoomReplay();
      const nextMembership: RoomMembershipView = { ...membership, status: "LOBBY" };
      setStoredRoomMembership(nextMembership);
      router.push(leadersPaths.room(membership.code));
    } catch (caught) {
      setReplayError(
        caught instanceof RoomConnectionError
          ? caught.message
          : "Could not reset the room for a rematch.",
      );
    } finally {
      setIsReplaying(false);
    }
  }, [membership, router]);

  const leaveHome = useCallback(async () => {
    await roomLeave.exitToPlay();
  }, [roomLeave]);

  return {
    replay,
    leaveHome,
    isReplaying,
    isLeaving: roomLeave.isLeaving,
    replayError,
    leaveError: roomLeave.leaveError,
  };
}
