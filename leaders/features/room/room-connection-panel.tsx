"use client";

import { formatRoomRole } from "@/leaders/lib/room-chat";
import type { RoomConnectionPeer, RoomLinkStatus } from "@/leaders/services/room-connection";
import type { RoomRole } from "@/leaders/services/room.types";

interface RoomConnectionPanelProps {
  code: string;
  selfRole: RoomRole;
  linkStatus: RoomLinkStatus;
  failureReason: string | null;
  peers: RoomConnectionPeer[];
  connectionError: string | null;
  hideCode?: boolean;
}

const ROLE_ORDER: Record<RoomRole, number> = {
  HOST: 0,
  GUEST: 1,
  SPECTATOR: 2,
};

export function formatLinkStatus(
  linkStatus: RoomLinkStatus,
  failureReason: string | null,
): string {
  switch (linkStatus) {
    case "signaling":
      return "Looking for the room on the relay…";
    case "waiting":
      return "Waiting for players.";
    case "open":
      return "Direct connection open.";
    case "failed":
      return failureReason ?? "The connection failed.";
    case "closed":
      return "You left the room.";
  }
}

export function RoomConnectionPanel({
  code,
  selfRole,
  linkStatus,
  failureReason,
  peers,
  connectionError,
  hideCode = false,
}: RoomConnectionPanelProps) {
  const statusText = formatLinkStatus(linkStatus, failureReason);
  const orderedPeers = [...peers].sort((left, right) => {
    const byRole = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
    if (byRole !== 0) {
      return byRole;
    }
    return left.username.localeCompare(right.username);
  });
  const alertText =
    connectionError && connectionError !== failureReason ? connectionError : null;

  return (
    <div className="panel space-y-4 p-6">
      {!hideCode ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-400">Code</span>
          <span className="font-mono text-lg text-amber-300">{code}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-400">Your role</span>
        <span className="text-sm text-zinc-100">{formatRoomRole(selfRole)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-400">Connection</span>
        <span
          className={`text-sm ${linkStatus === "failed" ? "text-red-200" : "text-zinc-100"}`}
        >
          {statusText}
        </span>
      </div>

      <div>
        <h2 className="text-sm text-zinc-400">Players</h2>
        {orderedPeers.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No other players yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {orderedPeers.map((peer) => (
              <li
                key={peer.peerId}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
              >
                <span className="text-sm text-zinc-100">
                  {peer.username}
                  <span className="text-zinc-500"> · {formatRoomRole(peer.role)}</span>
                </span>
                {peer.link === "connected" ? (
                  <span className="badge badge-ready">Connected</span>
                ) : (
                  <span className="text-sm text-red-200">
                    {peer.failureReason ?? "Could not open a direct connection to this peer."}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {alertText ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {alertText}
        </p>
      ) : null}

      <p className="text-sm text-zinc-400">
        If the host leaves, player 2 becomes host. The room closes when no players remain.
      </p>
    </div>
  );
}
