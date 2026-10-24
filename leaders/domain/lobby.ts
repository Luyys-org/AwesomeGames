import type { ChatMessageView, RoomMemberView, RoomRole, RoomStatus } from "@/leaders/services/room.types";
import type { RoomPresenceEventType } from "@/leaders/services/room-presence.types";

import type { GameState } from "@/leaders/domain/game-state";
import type { Rng } from "@/leaders/domain/rng";
import { createInitial } from "@/leaders/domain/state";

export class LobbyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LobbyError";
  }
}

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,64}$/;

export interface Seat {
  playerId: string;
  username: string;
  role: RoomRole;
  sessionToken: string;
  joinedAt: number;
}

export interface RoomRecord {
  code: string;
  name: string;
  status: RoomStatus;
  seats: Seat[];
  readyByPlayerId: Record<string, boolean>;
  game: GameState | null;
}

export interface PresenceEvent {
  type: RoomPresenceEventType;
  playerId: string;
  username: string;
  role: RoomRole;
}

export function assertUsername(username: string): string {
  if (!USERNAME_PATTERN.test(username)) {
    throw new LobbyError("Username must be 3-64 characters: letters, digits, underscore");
  }
  return username;
}

export function assertRoomName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 128) {
    throw new LobbyError("Room name is required");
  }
  return trimmed;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function generateRoomCode(
  isTaken: (code: string) => boolean,
  length = 6,
  random: () => number = Math.random,
): string {
  if (length < 4 || length > 12) {
    throw new LobbyError("Failed to generate a unique room code");
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    let code = "";
    for (let index = 0; index < length; index += 1) {
      code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) {
      return code;
    }
  }

  throw new LobbyError("Failed to generate a unique room code");
}

export function createRoom(input: {
  username: string;
  name: string;
  code: string;
  hostPlayerId: string;
  sessionToken: string;
  now?: number;
}): RoomRecord {
  const username = assertUsername(input.username);
  const name = assertRoomName(input.name);
  const host: Seat = {
    playerId: input.hostPlayerId,
    username,
    role: "HOST",
    sessionToken: input.sessionToken,
    joinedAt: input.now ?? 0,
  };

  return {
    code: normalizeRoomCode(input.code),
    name,
    status: "WAITING",
    seats: [host],
    readyByPlayerId: { [host.playerId]: false },
    game: null,
  };
}

export function joinRoom(
  room: RoomRecord,
  input: { username: string; playerId: string; sessionToken: string; now?: number },
): { room: RoomRecord; seat: Seat; presence: PresenceEvent | null } {
  const existing = room.seats.find((seat) => seat.sessionToken === input.sessionToken);
  if (existing) {
    return { room, seat: existing, presence: null };
  }

  const username = assertUsername(input.username);
  if (room.seats.some((seat) => seat.username === username)) {
    throw new LobbyError("Username is already taken in this room");
  }

  const guestTaken = room.seats.some((seat) => seat.role === "GUEST");
  const role: RoomRole = guestTaken ? "SPECTATOR" : "GUEST";
  const seat: Seat = {
    playerId: input.playerId,
    username,
    role,
    sessionToken: input.sessionToken,
    joinedAt: input.now ?? room.seats.length,
  };

  const next: RoomRecord = {
    ...room,
    seats: [...room.seats, seat],
    readyByPlayerId: { ...room.readyByPlayerId, [seat.playerId]: false },
    status: role === "GUEST" ? "LOBBY" : room.status,
  };

  return {
    room: next,
    seat,
    presence:
      role === "GUEST"
        ? { type: "GUEST_JOINED", playerId: seat.playerId, username: seat.username, role }
        : null,
  };
}

export interface LeaveRoomResult {
  room: RoomRecord;
  presence: PresenceEvent;
  promotedHostPlayerId?: string;
  roomClosed?: boolean;
}

export function chooseSeatRole(
  room: RoomRecord,
  playerId: string,
  desired: "GUEST" | "SPECTATOR",
): RoomRecord {
  const seat = requireSeat(room, playerId);
  if (seat.role === "HOST") {
    throw new LobbyError("Host must remain a player");
  }
  if (room.game) {
    throw new LobbyError("Game already started");
  }
  if (room.status === "IN_GAME") {
    throw new LobbyError("Game already started");
  }

  if (desired === "GUEST") {
    if (seat.role === "GUEST") {
      return room;
    }
    if (room.seats.some((entry) => entry.role === "GUEST")) {
      throw new LobbyError("This room already has a player.");
    }
    const seats = room.seats.map((entry) =>
      entry.playerId === playerId ? { ...entry, role: "GUEST" as RoomRole } : entry,
    );
    return { ...room, seats, status: "LOBBY" };
  }

  if (seat.role === "SPECTATOR") {
    return room;
  }

  const seats = room.seats.map((entry) =>
    entry.playerId === playerId ? { ...entry, role: "SPECTATOR" as RoomRole } : entry,
  );
  const readyByPlayerId = { ...room.readyByPlayerId, [playerId]: false };
  let status = room.status;
  if (status === "LOBBY" && !seats.some((entry) => entry.role === "GUEST")) {
    status = "WAITING";
  }
  return { ...room, seats, readyByPlayerId, status };
}

export function leaveRoom(room: RoomRecord, playerId: string): LeaveRoomResult {
  const seat = requireSeat(room, playerId);
  if (seat.role === "HOST") {
    if (room.status === "IN_GAME" || room.game) {
      throw new LobbyError("Host cannot leave during a game");
    }

    const guest = room.seats.find((entry) => entry.role === "GUEST");
    const readyByPlayerId = { ...room.readyByPlayerId };
    delete readyByPlayerId[playerId];

    if (guest) {
      const seats = room.seats
        .filter((entry) => entry.playerId !== playerId)
        .map((entry) =>
          entry.playerId === guest.playerId ? { ...entry, role: "HOST" as RoomRole } : entry,
        );
      let status = room.status;
      if (status === "LOBBY" && !seats.some((entry) => entry.role === "GUEST")) {
        status = "WAITING";
      }
      return {
        room: { ...room, seats, readyByPlayerId, status },
        presence: presenceFrom(seat, "DISCONNECTED"),
        promotedHostPlayerId: guest.playerId,
      };
    }

    const seats = room.seats.filter((entry) => entry.playerId !== playerId);
    const roomClosed = !seats.some((entry) => entry.role === "GUEST");
    return {
      room: { ...room, seats, readyByPlayerId, status: "WAITING" },
      presence: presenceFrom(seat, "DISCONNECTED"),
      roomClosed,
    };
  }

  const seats = room.seats.filter((entry) => entry.playerId !== playerId);
  const readyByPlayerId = { ...room.readyByPlayerId };
  delete readyByPlayerId[playerId];

  let status = room.status;
  if (seat.role === "GUEST" && status === "LOBBY" && !seats.some((entry) => entry.role === "GUEST")) {
    status = "WAITING";
  }

  return {
    room: { ...room, seats, readyByPlayerId, status },
    presence:
      seat.role === "GUEST"
        ? presenceFrom(seat, "GUEST_LEFT")
        : presenceFrom(seat, "DISCONNECTED"),
  };
}

export function disconnectMember(
  room: RoomRecord,
  playerId: string,
): { room: RoomRecord; presence: PresenceEvent | null; removed: boolean } {
  const seat = room.seats.find((entry) => entry.playerId === playerId);
  if (!seat) {
    return { room, presence: null, removed: false };
  }

  if (room.status === "IN_GAME" || seat.role === "HOST") {
    return { room, presence: presenceFrom(seat, "DISCONNECTED"), removed: false };
  }

  const left = leaveRoom(room, playerId);
  return { room: left.room, presence: left.presence, removed: true };
}

export function setReady(
  room: RoomRecord,
  playerId: string,
  ready: boolean,
  rng: Rng,
): { room: RoomRecord; presence: PresenceEvent[]; started: boolean } {
  const seat = requireSeat(room, playerId);
  if (seat.role === "SPECTATOR") {
    throw new LobbyError("Not a member of this room");
  }
  if (typeof ready !== "boolean") {
    throw new LobbyError("ready is required");
  }
  if (room.game) {
    throw new LobbyError("Game already started");
  }
  if (room.status !== "LOBBY") {
    throw new LobbyError("Room is not in lobby");
  }

  const readyByPlayerId = { ...room.readyByPlayerId, [playerId]: ready };
  const presence: PresenceEvent[] = [presenceFrom(seat, ready ? "PLAYER_READY" : "PLAYER_UNREADY")];
  const host = room.seats.find((entry) => entry.role === "HOST");
  const guest = room.seats.find((entry) => entry.role === "GUEST");
  const bothReady = Boolean(
    ready && host && guest && readyByPlayerId[host.playerId] && readyByPlayerId[guest.playerId],
  );

  if (!bothReady || !host || !guest) {
    return { room: { ...room, readyByPlayerId }, presence, started: false };
  }

  const game = createInitial({
    gameId: rng.nextId(),
    roomId: room.code,
    blackPlayerId: host.playerId,
    whitePlayerId: guest.playerId,
    rng,
  });
  presence.push(presenceFrom(seat, "GAME_STARTED"));

  return {
    room: { ...room, readyByPlayerId, status: "IN_GAME", game },
    presence,
    started: true,
  };
}

export function sendChat(
  room: RoomRecord,
  playerId: string,
  channel: "player" | "spectator",
  text: string,
  sentAt: string,
): ChatMessageView {
  const seat = requireSeat(room, playerId);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new LobbyError("Message text is required");
  }
  if (channel === "player" && seat.role === "SPECTATOR") {
    throw new LobbyError("Only players can send messages in player chat");
  }
  if (channel === "spectator" && seat.role !== "SPECTATOR") {
    throw new LobbyError("Only spectators can send messages in spectator chat");
  }

  return {
    senderPlayerId: seat.playerId,
    senderUsername: seat.username,
    senderRole: seat.role,
    text: trimmed,
    sentAt,
  };
}

export function canReadChat(role: RoomRole, channel: "player" | "spectator"): boolean {
  if (channel === "player") {
    return true;
  }
  return role === "SPECTATOR";
}

export function assertCanSubmitCommand(room: RoomRecord, playerId: string): Seat {
  const seat = requireSeat(room, playerId);
  if (room.status !== "IN_GAME" || !room.game) {
    throw new LobbyError("Game is not in progress");
  }
  if (seat.role === "SPECTATOR") {
    throw new LobbyError("Only players can send game commands");
  }
  return seat;
}

export function withGame(room: RoomRecord, game: GameState): RoomRecord {
  return {
    ...room,
    game,
    status: game.status === "WON" ? "FINISHED" : room.status,
  };
}

/** After a finished match, return to lobby so both players can ready up again. */
export function resetRoomForReplay(room: RoomRecord): RoomRecord {
  if (room.status === "LOBBY" && !room.game) {
    return room;
  }
  if (room.status !== "FINISHED") {
    throw new LobbyError("Room is not finished");
  }

  const readyByPlayerId: Record<string, boolean> = {};
  for (const seat of room.seats) {
    if (seat.role === "HOST" || seat.role === "GUEST") {
      readyByPlayerId[seat.playerId] = false;
    }
  }

  return {
    ...room,
    status: "LOBBY",
    game: null,
    readyByPlayerId: { ...room.readyByPlayerId, ...readyByPlayerId },
  };
}

export function memberViews(room: RoomRecord): RoomMemberView[] {
  return [...room.seats]
    .sort((left, right) => left.joinedAt - right.joinedAt)
    .map((seat) => ({ role: seat.role, username: seat.username }));
}

export function connectionPresence(seat: Seat): PresenceEvent {
  return presenceFrom(seat, seat.role === "SPECTATOR" ? "SPECTATOR_CONNECTED" : "PLAYER_CONNECTED");
}

function requireSeat(room: RoomRecord, playerId: string): Seat {
  const seat = room.seats.find((entry) => entry.playerId === playerId);
  if (!seat) {
    throw new LobbyError("Not a member of this room");
  }
  return seat;
}

function presenceFrom(seat: Seat, type: PresenceEvent["type"]): PresenceEvent {
  return {
    type,
    playerId: seat.playerId,
    username: seat.username,
    role: seat.role,
  };
}
