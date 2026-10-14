"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearStoredRoomMembership } from "@/leaders/lib/room-storage";
import { leadersPaths } from "@/leaders/paths";
import { RoomChatPanel } from "@/leaders/features/room/room-chat-panel";
import { RoomCodeCopy } from "@/leaders/features/room/room-code-copy";
import { RoomConnectionPanel } from "@/leaders/features/room/room-connection-panel";
import { RoomLobbyPanel } from "@/leaders/features/room/room-lobby-panel";
import { useRoomChat } from "@/leaders/features/room/use-room-chat";
import { useRoomConnection } from "@/leaders/features/room/use-room-connection";
import { useRoomLeave } from "@/leaders/features/room/use-room-leave";
import { useRoomLobby } from "@/leaders/features/room/use-room-lobby";
import { useRoomPresence } from "@/leaders/features/room/use-room-presence";
import { useRoomSeat } from "@/leaders/features/room/use-room-seat";
import { ROOM_CLOSED } from "@/leaders/services/room-connection";
import type { RoomMembershipView } from "@/leaders/services/room.types";

interface RoomActiveViewProps {
  membership: RoomMembershipView;
  onMembershipChange?: (membership: RoomMembershipView) => void;
}

export function RoomActiveView({ membership, onMembershipChange }: RoomActiveViewProps) {
  const router = useRouter();
  const connection = useRoomConnection(membership, onMembershipChange);
  const presence = useRoomPresence(membership);
  const lobby = useRoomLobby({
    membership,
    guestJoined: presence.guestJoined,
    hostReady: presence.hostReady,
    guestReady: presence.guestReady,
  });
  const seat = useRoomSeat(membership, presence.guestJoined);
  const chat = useRoomChat(membership);
  const roomLeave = useRoomLeave(membership);

  useEffect(() => {
    if (membership.status === "IN_GAME") {
      router.push(leadersPaths.match(membership.code));
    }
  }, [membership.code, membership.status, router]);

  useEffect(() => {
    if (connection.linkStatus === "failed" && connection.failureReason === ROOM_CLOSED) {
      clearStoredRoomMembership();
      router.replace(leadersPaths.home);
    }
  }, [connection.failureReason, connection.linkStatus, router]);

  return (
    <div className="flex min-h-0 w-full flex-1">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        <RoomChatPanel
          membership={membership}
          messages={chat.messages}
          status={chat.status}
          error={chat.error}
          sendMessage={chat.sendMessage}
          className="min-h-0 flex-1 rounded-none border-0 shadow-none"
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 py-8">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-50">
            {connection.displayName || "Room"}
          </h1>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Room code</p>
            <RoomCodeCopy code={connection.code} />
          </div>
        </header>

        <div className="mt-6 flex min-h-0 flex-1 gap-6">
          <RoomLobbyPanel
            membership={membership}
            members={presence.members}
            selfUsername={connection.selfUsername}
            linkStatus={connection.linkStatus}
            peers={connection.peers}
            hostReady={presence.hostReady}
            guestReady={presence.guestReady}
            canMarkReady={lobby.canMarkReady}
            isReadyPending={lobby.isReadyPending}
            seatError={seat.error}
            isSeatPending={seat.isPending}
            playerSlotTaken={seat.playerSlotTaken}
            error={lobby.error}
            isLoading={connection.isLobbyLoading}
            onToggleReady={() => {
              void lobby.toggleReady();
            }}
            onChooseSeat={(desired) => {
              void seat.chooseSeat(desired);
            }}
          />
          <div className="w-72 shrink-0 overflow-y-auto">
            <RoomConnectionPanel
              code={connection.code}
              selfRole={connection.selfRole}
              linkStatus={connection.linkStatus}
              failureReason={connection.failureReason}
              peers={connection.peers}
              connectionError={connection.connectionError}
              hideCode
            />
          </div>
        </div>

        <div className="mt-4 shrink-0 space-y-4">
          {roomLeave.leaveError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            >
              {roomLeave.leaveError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={roomLeave.isLeaving}
            onClick={() => {
              void roomLeave.exitToPlay();
            }}
            className="btn btn-secondary"
          >
            {roomLeave.isLeaving ? "Leaving…" : "Leave room"}
          </button>
        </div>
      </div>
    </div>
  );
}
