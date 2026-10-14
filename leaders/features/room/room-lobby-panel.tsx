"use client";

import type { RoomConnectionPeer, RoomLinkStatus } from "@/leaders/services/room-connection";
import type { RoomMemberView, RoomMembershipView } from "@/leaders/services/room.types";

interface RoomLobbyPanelProps {
  membership: RoomMembershipView;
  members: RoomMemberView[];
  selfUsername: string;
  linkStatus: RoomLinkStatus;
  peers: RoomConnectionPeer[];
  hostReady: boolean;
  guestReady: boolean;
  canMarkReady: boolean;
  isReadyPending: boolean;
  seatError: string | null;
  isSeatPending: boolean;
  playerSlotTaken: boolean;
  error: string | null;
  isLoading: boolean;
  onToggleReady: () => void;
  onChooseSeat: (seat: "GUEST" | "SPECTATOR") => void;
}

function LobbyLoadingSpinner() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70"
      role="status"
      aria-live="polite"
      aria-label="Loading lobby"
    >
      <div className="size-9 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      <span className="sr-only">Loading lobby</span>
    </div>
  );
}

function memberConnectionConnected(
  username: string,
  selfUsername: string,
  linkStatus: RoomLinkStatus,
  peers: RoomConnectionPeer[],
): boolean {
  const isSelf =
    selfUsername.length > 0 && username.toLowerCase() === selfUsername.toLowerCase();
  if (isSelf) {
    return linkStatus === "open" || linkStatus === "waiting";
  }
  const peer = peers.find(
    (entry) => entry.username.toLowerCase() === username.toLowerCase(),
  );
  return peer?.link === "connected";
}

function ConnectionDot({ connected, username }: { connected: boolean; username: string }) {
  return (
    <span
      className={`size-2 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
      title={connected ? "Connected" : "Not connected"}
      aria-label={`${username}: ${connected ? "connected" : "not connected"}`}
    />
  );
}

function MemberName({ username, isSelf }: { username: string; isSelf: boolean }) {
  return (
    <span className={isSelf ? "font-medium text-amber-500" : "text-zinc-100"}>{username}</span>
  );
}

function ReadyCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReadyCrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 5L11 11M11 5L5 11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const readyToggleStripClass =
  "flex w-11 shrink-0 items-center justify-center self-stretch border-l border-zinc-800";

function ReadyToggle({
  ready,
  canToggle,
  pending,
  onToggle,
}: {
  ready: boolean;
  canToggle: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const iconClass = ready ? "text-emerald-400" : "text-red-400/90";
  const icon = ready ? <ReadyCheckIcon /> : <ReadyCrossIcon />;
  const stripClass = `${readyToggleStripClass} ${iconClass}`;

  if (!canToggle) {
    return (
      <span className={stripClass} title={ready ? "Ready" : "Not ready"}>
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        onToggle();
      }}
      className={`${stripClass} transition-colors hover:bg-zinc-900 disabled:opacity-50`}
      aria-label={ready ? "Mark not ready" : "Mark ready"}
    >
      {icon}
    </button>
  );
}

function PlayerRow({
  username,
  isSelf,
  connected,
  ready,
  canToggleReady,
  isReadyPending,
  onToggleReady,
}: {
  username: string;
  isSelf: boolean;
  connected: boolean;
  ready: boolean;
  canToggleReady: boolean;
  isReadyPending: boolean;
  onToggleReady: () => void;
}) {
  return (
    <li className="flex min-h-11 items-stretch overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
        <ConnectionDot connected={connected} username={username} />
        <MemberName username={username} isSelf={isSelf} />
      </div>
      <ReadyToggle
        ready={ready}
        canToggle={canToggleReady}
        pending={isReadyPending}
        onToggle={onToggleReady}
      />
    </li>
  );
}

export function RoomLobbyPanel({
  membership,
  members,
  selfUsername,
  linkStatus,
  peers,
  hostReady,
  guestReady,
  canMarkReady,
  isReadyPending,
  seatError,
  isSeatPending,
  playerSlotTaken,
  error,
  isLoading,
  onToggleReady,
  onChooseSeat,
}: RoomLobbyPanelProps) {
  const isHost = membership.role === "HOST";
  const seatChoice: "GUEST" | "SPECTATOR" | null = isHost
    ? "GUEST"
    : membership.role === "GUEST"
      ? "GUEST"
      : membership.role === "SPECTATOR"
        ? "SPECTATOR"
        : null;

  const host = members.find((member) => member.role === "HOST");
  const guest = members.find((member) => member.role === "GUEST");
  const spectators = members.filter((member) => member.role === "SPECTATOR");

  const isSelf = (username: string) =>
    selfUsername.length > 0 && username.toLowerCase() === selfUsername.toLowerCase();

  const connectionFor = (username: string) =>
    memberConnectionConnected(username, selfUsername, linkStatus, peers);

  const canToggleHostReady = membership.role === "HOST" && canMarkReady;
  const canToggleGuestReady = membership.role === "GUEST" && canMarkReady;

  return (
    <section
      className="panel relative flex min-h-0 flex-1 flex-col p-6"
      aria-busy={isLoading}
    >
      {isLoading ? <LobbyLoadingSpinner /> : null}

      <h2 className="shrink-0 text-sm font-semibold text-zinc-100">Match lobby</h2>

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-6">
        <div className="flex min-h-0 flex-col">
          <h3 className="text-xs font-medium text-zinc-500">Players</h3>
          <ul className="mt-3 space-y-2">
            {host ? (
              <PlayerRow
                username={host.username}
                isSelf={isSelf(host.username)}
                connected={connectionFor(host.username)}
                ready={hostReady}
                canToggleReady={canToggleHostReady}
                isReadyPending={isReadyPending}
                onToggleReady={onToggleReady}
              />
            ) : null}
            {guest ? (
              <PlayerRow
                username={guest.username}
                isSelf={isSelf(guest.username)}
                connected={connectionFor(guest.username)}
                ready={guestReady}
                canToggleReady={canToggleGuestReady}
                isReadyPending={isReadyPending}
                onToggleReady={onToggleReady}
              />
            ) : (
              <li className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-sm text-zinc-600">—</span>
              </li>
            )}
          </ul>
        </div>

        <div className="flex min-h-0 flex-col border-l border-zinc-800 pl-6">
          <h3 className="text-xs font-medium text-zinc-500">Spectators</h3>
          {spectators.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">—</p>
          ) : (
            <ul className="mt-3 space-y-2 overflow-y-auto">
              {spectators.map((member) => (
                <li
                  key={member.username}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                >
                  <MemberName username={member.username} isSelf={isSelf(member.username)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0 space-y-4 border-t border-zinc-800 pt-4">
        {!isHost ? (
          <fieldset>
            <legend className="sr-only">Seat</legend>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSeatPending || playerSlotTaken}
                aria-pressed={seatChoice === "GUEST"}
                onClick={() => {
                  onChooseSeat("GUEST");
                }}
                className={`btn flex-1 ${seatChoice === "GUEST" ? "btn-primary" : "btn-secondary"}`}
              >
                Player
              </button>
              <button
                type="button"
                disabled={isSeatPending}
                aria-pressed={seatChoice === "SPECTATOR"}
                onClick={() => {
                  onChooseSeat("SPECTATOR");
                }}
                className={`btn flex-1 ${seatChoice === "SPECTATOR" ? "btn-primary" : "btn-secondary"}`}
              >
                Spectator
              </button>
            </div>
            {seatError ? (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {seatError}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
