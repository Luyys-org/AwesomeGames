import { openMesh, type JsonValue, type Mesh } from "@/common/p2p";

import {
  assertCanSubmitCommand,
  canReadChat,
  chooseSeatRole,
  createRoom as createLobby,
  disconnectMember,
  joinRoom as joinLobby,
  leaveRoom as leaveLobby,
  LobbyError,
  memberViews,
  sendChat,
  resetRoomForReplay,
  setReady,
  withGame,
  type RoomRecord,
} from "@/leaders/domain/lobby";
import type { GameState } from "@/leaders/domain/game-state";
import { defaultRng, type Rng } from "@/leaders/domain/rng";
import { toGameStateView, tryCommit } from "@/leaders/domain/submit";
import type { GameCommandRejectionCode } from "@/leaders/lib/parse-game-state";
import type { GameCommandRequest, GameStateView } from "@/leaders/services/game.types";
import {
  HOST_TAKEN,
  MAX_REMOTE_PEERS,
  ROOM_FULL,
  seatRejectionReason,
  type SeatIntro,
} from "@/leaders/services/room-connection-seat";
import type {
  ChatMessageView,
  RoomMemberView,
  RoomMembershipView,
  RoomRole,
  RoomStatus,
} from "@/leaders/services/room.types";

const APP_ID = "app.dirigeant";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RELAY_WAIT_MS = 12_000;
const HOST_WAIT_MS = 15_000;
const HANDSHAKE_TIMEOUT_MS = 12_000;
const INTENT_TIMEOUT_MS = 12_000;
const DIRECT_LINK_FAILURE = "Could not open a direct connection to this peer.";
const HOST_DISCONNECTED = "The host disconnected.";
const HOST_MISSING = "Host is not in this room.";
const USERNAME_REQUIRED = "Enter a username.";
export const ROOM_CLOSED = "The room has closed.";

function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  // #region agent log
  fetch("http://127.0.0.1:7914/ingest/569f213a-c103-49f8-9bbf-791d0ee86237",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"f7ac87"},body:JSON.stringify({sessionId:"f7ac87",runId:"pre-fix",hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

export class RoomConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomConnectionError";
  }
}

export class GameCommandError extends Error {
  readonly code: GameCommandRejectionCode;
  readonly actualVersion?: number;

  constructor(code: GameCommandRejectionCode, message: string, actualVersion?: number) {
    super(message);
    this.name = "GameCommandError";
    this.code = code;
    this.actualVersion = actualVersion;
  }
}

export type RoomLinkStatus = "signaling" | "waiting" | "open" | "failed" | "closed";

export type PeerLinkStatus = "connected" | "failed";

export interface RoomConnectionPeer {
  peerId: string;
  role: RoomRole;
  username: string;
  link: PeerLinkStatus;
  failureReason: string | null;
}

export interface RoomConnectionSnapshot {
  code: string;
  name: string;
  selfRole: RoomRole;
  selfUsername: string;
  selfPlayerId: string;
  linkStatus: RoomLinkStatus;
  failureReason: string | null;
  peers: RoomConnectionPeer[];
  roomStatus: RoomStatus;
  members: RoomMemberView[];
  hostReady: boolean;
  guestReady: boolean;
  playerChat: ChatMessageView[];
  spectatorChat: ChatMessageView[];
  game: GameState | null;
}

interface HostWaiter {
  resolve: () => void;
  reject: (error: RoomConnectionError) => void;
}

interface SeatSecret {
  playerId: string;
  sessionToken: string;
}

interface ActionResult {
  ok: boolean;
  reason?: string;
  code?: GameCommandRejectionCode;
  actualVersion?: number;
  role?: RoomRole;
  playerId?: string;
  roomName?: string;
  status?: RoomStatus;
  members?: RoomMemberView[];
  hostReady?: boolean;
  guestReady?: boolean;
  game?: GameState | null;
}

interface Session {
  mesh: Mesh;
  selfId: string;
  code: string;
  name: string;
  selfRole: RoomRole;
  selfUsername: string;
  selfPlayerId: string;
  seat: SeatSecret | null;
  record: RoomRecord | null;
  cachedRecord: RoomRecord | null;
  rng: Rng | null;
  roomStatus: RoomStatus;
  members: RoomMemberView[];
  hostReady: boolean;
  guestReady: boolean;
  playerChat: ChatMessageView[];
  spectatorChat: ChatMessageView[];
  game: GameState | null;
  playerIdByPeer: Map<string, string>;
  peerIdByPlayer: Map<string, string>;
  joinRequested: boolean;
  openedAt: number;
  linkStatus: RoomLinkStatus;
  failureReason: string | null;
  peers: Map<string, RoomConnectionPeer>;
  reserved: Map<string, RoomRole>;
  intros: Map<string, SeatIntro>;
  hostWaiters: HostWaiter[];
  hostTimer: ReturnType<typeof setTimeout> | null;
  hostAccepted: boolean;
  meshClosed: boolean;
  hidden: boolean;
  debugStop: (() => void) | null;
}

let currentSession: Session | null = null;
let snapshot: RoomConnectionSnapshot | null = null;
let operation: Promise<RoomMembershipView> | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): RoomConnectionSnapshot | null {
  return snapshot;
}

export function getServerSnapshot(): null {
  return null;
}

export function membershipFromConnection(
  connection: RoomConnectionSnapshot,
): RoomMembershipView {
  return {
    code: connection.code,
    name: connection.name,
    role: connection.selfRole,
    status: connection.roomStatus,
    members:
      connection.members.length > 0
        ? connection.members
        : [{ role: connection.selfRole, username: connection.selfUsername }],
  };
}

export interface CreateRoomConnectionRequest {
  name: string;
  username: string;
  code?: string;
}

export interface JoinRoomConnectionRequest {
  code: string;
  username: string;
  name?: string;
}

export function createRoom(
  request: CreateRoomConnectionRequest,
): Promise<RoomMembershipView> {
  return runExclusive(() => openRoom({
    code: request.code ?? createRoomCode(),
    name: request.name.trim(),
    role: "HOST",
    username: request.username.trim(),
    requireName: !request.code,
  }));
}

export function joinRoom(
  request: JoinRoomConnectionRequest,
): Promise<RoomMembershipView> {
  return runExclusive(() => openRoom({
    code: normalizeRoomCode(request.code),
    name: request.name?.trim() ?? "",
    role: "SPECTATOR",
    username: request.username.trim(),
    requireName: false,
  }));
}

export async function leaveRoom(): Promise<void> {
  const session = currentSession;
  if (!session) {
    return;
  }

  if (session.selfRole === "HOST" && session.record) {
    await commitHostDeparture(session);
    await forceClose(session);
    return;
  }

  if (session.selfRole !== "HOST" && session.linkStatus !== "failed") {
    const hostId = hostPeerId(session);
    if (hostId) {
      try {
        await session.mesh.request(
          { kind: "leave" },
          { target: hostId, timeoutMs: 4_000 },
        );
      } catch {
        // The host may already be gone. Closing the link still drops the seat.
      }
    }
  }

  await forceClose(session);
}

export async function setRoomSeat(desired: "GUEST" | "SPECTATOR"): Promise<void> {
  const session = requireSession();
  if (session.selfRole === "HOST") {
    throw new RoomConnectionError("Host must remain a player.");
  }

  const response = await session.mesh.request(
    { kind: "seat", desired },
    { target: requireHostPeer(session), timeoutMs: INTENT_TIMEOUT_MS },
  );
  const result = parseActionResult(response);
  if (!result.ok) {
    throw new RoomConnectionError(result.reason || "Could not update your seat.");
  }
  applyWelcome(session, result);
}

export async function requestRoomReplay(): Promise<void> {
  const session = requireSession();
  if (session.selfRole === "HOST") {
    const result = commitReplay(session, session.selfPlayerId);
    if (!result.ok) {
      throw new RoomConnectionError(result.reason ?? "Could not reset the room.");
    }
    return;
  }

  const response = await session.mesh.request(
    { kind: "replay" },
    { target: requireHostPeer(session), timeoutMs: INTENT_TIMEOUT_MS },
  );
  const result = parseActionResult(response);
  if (!result.ok) {
    throw new RoomConnectionError(result.reason || "Could not reset the room.");
  }
  applyWelcome(session, result);
}

export async function setRoomReady(ready: boolean): Promise<void> {
  const session = requireSession();
  if (session.selfRole === "HOST") {
    const result = commitReady(session, session.selfPlayerId, ready);
    if (!result.ok) {
      throw new RoomConnectionError(result.reason ?? "Could not update ready status.");
    }
    return;
  }

  const response = await session.mesh.request(
    { kind: "ready", ready },
    { target: requireHostPeer(session), timeoutMs: INTENT_TIMEOUT_MS },
  );
  const result = parseActionResult(response);
  if (!result.ok) {
    throw new RoomConnectionError(result.reason || "Could not update ready status.");
  }
  applyWelcome(session, result);
}

export async function sendRoomChat(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new RoomConnectionError("Message text is required");
  }

  const session = requireSession();
  if (session.selfRole === "HOST") {
    const result = commitChat(session, session.selfPlayerId, trimmed);
    if (!result.ok) {
      throw new RoomConnectionError(result.reason ?? "Could not send the message.");
    }
    return;
  }

  const response = await session.mesh.request(
    { kind: "chat", text: trimmed },
    { target: requireHostPeer(session), timeoutMs: INTENT_TIMEOUT_MS },
  );
  const result = parseActionResult(response);
  if (!result.ok) {
    throw new RoomConnectionError(result.reason || "Could not send the message.");
  }
}

export async function submitGameCommand(
  command: GameCommandRequest,
): Promise<GameStateView> {
  const session = requireSession();
  if (session.selfRole === "HOST") {
    const result = commitCommand(session, session.selfPlayerId, command);
    if (!result.ok || !session.game) {
      throw commandError(result);
    }
    return toGameStateView(session.game);
  }

  const response = await session.mesh.request(
    { kind: "command", command: jsonClone(command) },
    { target: requireHostPeer(session), timeoutMs: INTENT_TIMEOUT_MS },
  );
  const result = parseActionResult(response);
  if (!result.ok || !result.game) {
    throw commandError(result);
  }
  applyRemoteGame(session, result.game);
  return toGameStateView(result.game);
}

export async function requestGameSnapshot(): Promise<void> {
  const session = currentSession;
  if (!session || session.hidden || session.linkStatus === "failed" || session.linkStatus === "closed") {
    return;
  }

  if (session.selfRole === "HOST") {
    publish(session);
    return;
  }

  const hostId = hostPeerId(session);
  if (!hostId) {
    return;
  }

  try {
    const response = await session.mesh.request(
      { kind: "snapshot" },
      { target: hostId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    const result = parseActionResult(response);
    if (result.ok && result.game) {
      applyRemoteGame(session, result.game);
    }
  } catch {
    // The board keeps waiting until a broadcast arrives.
  }
}

export function ensureConnected(
  membership: RoomMembershipView,
): Promise<RoomMembershipView> {
  const live = currentSession;
  if (
    live &&
    live.code === membership.code.toUpperCase() &&
    !live.hidden &&
    live.linkStatus !== "closed" &&
    live.linkStatus !== "failed"
  ) {
    return Promise.resolve(membershipFromConnection(toSnapshot(live)));
  }

  if (operation) {
    return operation;
  }

  const username = membership.members?.find((member) => member.role === membership.role)?.username;
  if (!username) {
    return Promise.reject(new RoomConnectionError(USERNAME_REQUIRED));
  }

  if (membership.role === "HOST") {
    return createRoom({
      name: membership.name,
      username,
      code: membership.code,
    });
  }

  return joinRoom({
    code: membership.code,
    username,
    name: membership.name,
  });
}

async function openRoom(input: {
  code: string;
  name: string;
  role: RoomRole;
  username: string;
  requireName: boolean;
}): Promise<RoomMembershipView> {
  if (!input.username) {
    throw new RoomConnectionError(USERNAME_REQUIRED);
  }
  if (input.requireName && !input.name) {
    throw new RoomConnectionError("Enter a room name.");
  }

  const code = normalizeRoomCode(input.code);
  if (
    currentSession &&
    currentSession.code === code &&
    !currentSession.hidden &&
    !currentSession.meshClosed &&
    currentSession.linkStatus !== "closed" &&
    currentSession.linkStatus !== "failed"
  ) {
    return membershipFromConnection(toSnapshot(currentSession));
  }

  if (currentSession) {
    await forceClose(currentSession);
  }

  const session = await createSession({
    code,
    name: input.name,
    role: input.role,
    username: input.username,
  });
  currentSession = session;
  if (session.selfRole === "HOST") {
    adoptHostRecord(session);
  }
  publish(session);

  try {
    await session.mesh.waitForRelay(
      () => session.hidden || session.linkStatus === "failed",
    );
    if (session.hidden) {
      throw new RoomConnectionError("The room connection was closed.");
    }
    const statusAfterRelay = session.linkStatus;
    if (statusAfterRelay === "failed") {
      throw new RoomConnectionError(session.failureReason ?? "Could not join the room.");
    }

    if (session.selfRole === "HOST") {
      if (session.linkStatus === "signaling") {
        session.linkStatus = "waiting";
      }
      refreshLinkStatus(session);
      publish(session);
      return membershipFromConnection(toSnapshot(session));
    }

    await waitForHost(session);
    const statusAfterHost = session.linkStatus;
    if (statusAfterHost === "failed") {
      throw new RoomConnectionError(session.failureReason ?? "Could not join the room.");
    }
    publish(session);
    return membershipFromConnection(toSnapshot(session));
  } catch (caught) {
    const error = toConnectionError(caught);
    if (currentSession === session) {
      session.hidden = true;
      currentSession = null;
      publish(null);
    }
    await closeMesh(session);
    throw error;
  }
}

async function createSession(input: {
  code: string;
  name: string;
  role: RoomRole;
  username: string;
}): Promise<Session> {
  const session: Session = {
    mesh: null as unknown as Mesh,
    selfId: "",
    code: input.code,
    name: input.name,
    selfRole: input.role,
    selfUsername: input.username,
    selfPlayerId: "",
    seat: null,
    record: null,
    cachedRecord: null,
    rng: null,
    roomStatus: "WAITING",
    members: [],
    hostReady: false,
    guestReady: false,
    playerChat: [],
    spectatorChat: [],
    game: null,
    playerIdByPeer: new Map(),
    peerIdByPlayer: new Map(),
    joinRequested: false,
    openedAt: Date.now(),
    linkStatus: "signaling",
    failureReason: null,
    peers: new Map(),
    reserved: new Map(),
    intros: new Map(),
    hostWaiters: [],
    hostTimer: null,
    hostAccepted: false,
    meshClosed: false,
    hidden: false,
    debugStop: null,
  };

  session.mesh = await openMesh({
    appId: APP_ID,
    roomCode: input.code,
    handshakeTimeoutMs: HANDSHAKE_TIMEOUT_MS,
    relayWaitMs: RELAY_WAIT_MS,
    requestAction: "lobby-intent",
    feedAction: "lobby-feed",
    onHandshake: (peerId, send, receive, isInitiator) =>
      runHandshake(session, peerId, send, receive, isInitiator),
    onJoinError: (peerId, error) => {
      handleJoinError(session, { peerId, error });
    },
    onPeerJoin: (peerId) => {
      handlePeerJoin(session, peerId);
    },
    onPeerLeave: (peerId) => {
      handlePeerLeave(session, peerId);
    },
    onRequest: (data, peerId) => {
      try {
        if (session.selfRole !== "HOST" || !session.record) {
          return { ok: false, reason: "Not the host." };
        }
        return toJsonResult(handleHostIntent(session, peerId, data));
      } catch (caught) {
        return { ok: false, reason: actionMessage(caught) };
      }
    },
    onMessage: (data) => {
      handleFeed(session, data);
    },
  });
  session.selfId = session.mesh.selfId;
  watchDebugIce(session);

  return session;
}

function adoptHostRecord(session: Session): void {
  const seat = loadSeatSecret(session.code);
  session.seat = seat;
  session.selfPlayerId = seat.playerId;
  session.record = createLobby({
    username: session.selfUsername,
    name: session.name,
    code: session.code,
    hostPlayerId: seat.playerId,
    sessionToken: seat.sessionToken,
    now: Date.now(),
  });
  session.rng = defaultRng();
  syncFromRecord(session);
}

async function requestLobbyJoin(session: Session, hostId: string): Promise<void> {
  if (session.joinRequested || session.selfRole === "HOST") {
    return;
  }
  session.joinRequested = true;
  const seat = loadSeatSecret(session.code);
  session.seat = seat;
  session.selfPlayerId = seat.playerId;

  try {
    const response = await session.mesh.request(
      {
        kind: "join",
        username: session.selfUsername,
        playerId: seat.playerId,
        sessionToken: seat.sessionToken,
      },
      { target: hostId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    if (session.hidden || session.linkStatus === "failed") {
      return;
    }
    const result = parseActionResult(response);
    if (!result.ok || !result.role || !result.playerId) {
      failSession(session, result.reason || "The host rejected this connection.");
      return;
    }
    applyWelcome(session, result);
    resolveHostWaiters(session);
  } catch (caught) {
    if (session.hidden || session.linkStatus === "failed") {
      return;
    }
    failSession(session, toConnectionError(caught).message);
  }
}

function handleHostIntent(session: Session, peerId: string, data: JsonValue): ActionResult {
  const record = asRecord(data);
  if (!record) {
    return { ok: false, reason: "Invalid room action." };
  }

  switch (record.kind) {
    case "join":
      return commitJoin(session, peerId, record);
    case "leave":
      return commitLeave(session, peerId);
    case "seat":
      return commitChooseSeat(
        session,
        session.playerIdByPeer.get(peerId) ?? "",
        record.desired === "GUEST" ? "GUEST" : record.desired === "SPECTATOR" ? "SPECTATOR" : null,
      );
    case "ready":
      return commitReady(session, session.playerIdByPeer.get(peerId) ?? "", record.ready === true);
    case "chat":
      return commitChat(
        session,
        session.playerIdByPeer.get(peerId) ?? "",
        typeof record.text === "string" ? record.text : "",
      );
    case "command": {
      const command = parseCommand(record.command);
      if (!command) {
        return { ok: false, code: "VALIDATION", reason: "expectedVersion is required" };
      }
      return commitCommand(session, session.playerIdByPeer.get(peerId) ?? "", command);
    }
    case "snapshot":
      return session.record?.game
        ? { ok: true, game: session.record.game }
        : { ok: true };
    case "replay":
      return commitReplay(session, session.playerIdByPeer.get(peerId) ?? "");
    default:
      return { ok: false, reason: "Unknown room action." };
  }
}

function commitJoin(
  session: Session,
  peerId: string,
  body: Record<string, unknown>,
): ActionResult {
  if (!session.record) {
    return { ok: false, reason: "The host is not ready." };
  }

  const username = typeof body.username === "string" ? body.username : "";
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!playerId || !sessionToken) {
    return { ok: false, reason: "Invalid room handshake." };
  }

  try {
    const joined = joinLobby(session.record, {
      username,
      playerId,
      sessionToken,
      now: Date.now(),
    });
    session.record = joined.room;
    bindPeer(session, peerId, joined.seat.playerId);
    const peer = session.peers.get(peerId);
    if (peer) {
      peer.role = joined.seat.role;
      peer.username = joined.seat.username;
    }
    syncFromRecord(session);
    void broadcastState(session);
    return {
      ok: true,
      role: joined.seat.role,
      playerId: joined.seat.playerId,
      roomName: session.record.name,
      status: session.roomStatus,
      members: session.members,
      hostReady: session.hostReady,
      guestReady: session.guestReady,
      game: session.game,
    };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

function commitChooseSeat(
  session: Session,
  playerId: string,
  desired: "GUEST" | "SPECTATOR" | null,
): ActionResult {
  if (!session.record || !playerId || !desired) {
    return { ok: false, reason: "Invalid seat request." };
  }

  try {
    session.record = chooseSeatRole(session.record, playerId, desired);
    syncFromRecord(session);
    void broadcastState(session);
    const seat = session.record.seats.find((entry) => entry.playerId === playerId);
    return {
      ok: true,
      role: seat?.role,
      playerId: seat?.playerId,
      roomName: session.record.name,
      status: session.roomStatus,
      members: session.members,
      hostReady: session.hostReady,
      guestReady: session.guestReady,
      game: session.game,
    };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

async function commitHostDeparture(session: Session): Promise<void> {
  if (!session.record) {
    return;
  }

  try {
    const left = leaveLobby(session.record, session.selfPlayerId);
    session.record = left.room;
    const targets = connectedPeerIds(session);
    if (left.promotedHostPlayerId) {
      syncFromRecord(session);
      await broadcastState(session);
      await broadcast(
        session,
        {
          kind: "host_handoff",
          promotedHostPlayerId: left.promotedHostPlayerId,
          record: jsonClone(session.record),
        },
        targets,
      );
    } else if (left.roomClosed) {
      await broadcast(session, { kind: "room_closed" }, targets);
    } else {
      syncFromRecord(session);
      await broadcastState(session);
    }
  } catch (caught) {
    throw new RoomConnectionError(actionMessage(caught));
  }
}

function commitLeave(session: Session, peerId: string): ActionResult {
  const playerId = session.playerIdByPeer.get(peerId);
  if (!session.record || !playerId) {
    return { ok: true };
  }

  try {
    const left = leaveLobby(session.record, playerId);
    session.record = left.room;
    session.peerIdByPlayer.delete(playerId);
    session.playerIdByPeer.delete(peerId);
    syncFromRecord(session);
    void broadcastState(session);
    return { ok: true };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

function commitReplay(session: Session, playerId: string): ActionResult {
  if (!session.record) {
    return { ok: false, reason: "The host is not ready." };
  }
  if (!playerId || !session.record.seats.some((seat) => seat.playerId === playerId)) {
    return { ok: false, reason: "Not a member of this room" };
  }

  try {
    session.record = resetRoomForReplay(session.record);
    syncFromRecord(session);
    void broadcastState(session);
    return {
      ok: true,
      status: session.roomStatus,
      members: session.members,
      hostReady: session.hostReady,
      guestReady: session.guestReady,
      game: null,
    };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

function commitReady(session: Session, playerId: string, ready: boolean): ActionResult {
  if (!session.record || !session.rng) {
    return { ok: false, reason: "The host is not ready." };
  }

  try {
    const result = setReady(session.record, playerId, ready, session.rng);
    session.record = result.room;
    syncFromRecord(session);
    void broadcastState(session);
    return {
      ok: true,
      status: session.roomStatus,
      members: session.members,
      hostReady: session.hostReady,
      guestReady: session.guestReady,
      game: session.game,
    };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

function commitChat(session: Session, playerId: string, text: string): ActionResult {
  if (!session.record) {
    return { ok: false, reason: "The host is not ready." };
  }

  const seat = session.record.seats.find((entry) => entry.playerId === playerId);
  if (!seat) {
    return { ok: false, reason: "Not a member of this room" };
  }

  const channel = seat.role === "SPECTATOR" ? "spectator" : "player";
  try {
    const message = sendChat(session.record, playerId, channel, text, new Date().toISOString());
    if (canReadChat(session.selfRole, channel)) {
      appendChat(session, channel, message);
    }
    const targets = [...session.peers.values()]
      .filter((peer) => peer.link === "connected" && canReadChat(peer.role, channel))
      .map((peer) => peer.peerId);
    void broadcast(session, {
      kind: "chat",
      channel,
      message: jsonClone(message),
    }, targets);
    publish(session);
    return { ok: true };
  } catch (caught) {
    return { ok: false, reason: actionMessage(caught) };
  }
}

function commitCommand(
  session: Session,
  playerId: string,
  command: GameCommandRequest,
): ActionResult {
  if (!session.record || !session.rng || !session.record.game) {
    return { ok: false, code: "GAME_NOT_FOUND", reason: "Game is not in progress" };
  }

  try {
    assertCanSubmitCommand(session.record, playerId);
  } catch (caught) {
    return { ok: false, code: "VALIDATION", reason: actionMessage(caught) };
  }

  const outcome = tryCommit(session.record.game, command, playerId, session.rng);
  if (!outcome.ok) {
    return {
      ok: false,
      code: outcome.rejection.code,
      reason: outcome.rejection.message,
      actualVersion: outcome.rejection.actualVersion,
    };
  }

  session.record = withGame(session.record, outcome.state);
  syncFromRecord(session);
  void broadcastState(session);
  return { ok: true, game: outcome.state };
}

function syncFromRecord(session: Session): void {
  if (!session.record) {
    return;
  }

  const host = session.record.seats.find((seat) => seat.role === "HOST");
  const guest = session.record.seats.find((seat) => seat.role === "GUEST");
  session.name = session.record.name;
  session.roomStatus = session.record.status;
  session.members = memberViews(session.record);
  session.hostReady = host ? session.record.readyByPlayerId[host.playerId] === true : false;
  session.guestReady = guest ? session.record.readyByPlayerId[guest.playerId] === true : false;
  session.game = session.record.game;
  applyMemberRoles(session);
  refreshLinkStatus(session);
  publish(session);
}

function applyWelcome(session: Session, result: ActionResult): void {
  if (result.role) {
    session.selfRole = result.role;
  }
  if (result.playerId) {
    session.selfPlayerId = result.playerId;
  }
  if (result.roomName) {
    session.name = result.roomName;
  }
  if (result.status) {
    session.roomStatus = result.status;
  }
  if (result.members) {
    session.members = result.members;
  }
  session.hostReady = result.hostReady === true;
  session.guestReady = result.guestReady === true;
  if (result.game !== undefined) {
    session.game = result.game;
  }
  applyMemberRoles(session);
  refreshLinkStatus(session);
  publish(session);
}

function applyRemoteGame(session: Session, game: GameState): void {
  if (session.game && game.version < session.game.version) {
    return;
  }
  session.game = game;
  if (session.record && session.selfRole === "HOST") {
    session.record = withGame(session.record, game);
  }
  publish(session);
}

function handleFeed(session: Session, data: JsonValue): void {
  const record = asRecord(data);
  if (!record || session.hidden) {
    return;
  }

  if (record.kind === "host_handoff") {
    if (session.selfRole === "HOST") {
      return;
    }
    const promotedHostPlayerId =
      typeof record.promotedHostPlayerId === "string" ? record.promotedHostPlayerId : "";
    const handoffRecord = parseRoomRecord(record.record);
    if (promotedHostPlayerId === session.selfPlayerId && handoffRecord) {
      adoptPromotedHost(session, handoffRecord);
    }
    return;
  }

  if (record.kind === "room_closed") {
    if (session.selfRole !== "HOST") {
      failSession(session, ROOM_CLOSED);
    }
    return;
  }

  if (session.selfRole === "HOST") {
    return;
  }

  if (record.kind === "state") {
    const status = parseStatus(record.status);
    if (status) {
      session.roomStatus = status;
    }
    const members = parseMembers(record.members);
    if (members) {
      session.members = members;
      const self = members.find((member) => member.username === session.selfUsername);
      if (self) {
        session.selfRole = self.role;
      }
    }
    if (typeof record.hostReady === "boolean") {
      session.hostReady = record.hostReady;
    }
    if (typeof record.guestReady === "boolean") {
      session.guestReady = record.guestReady;
    }
    const game = parseGameState(record.game);
    if (game) {
      applyRemoteGame(session, game);
    }
    const snapshotRecord = parseRoomRecord(record.record);
    if (snapshotRecord) {
      session.cachedRecord = snapshotRecord;
    }
    applyMemberRoles(session);
    refreshLinkStatus(session);
    publish(session);
    return;
  }

  if (record.kind === "chat") {
    const channel = record.channel === "spectator" || record.channel === "player"
      ? record.channel
      : null;
    const message = parseChatMessage(record.message);
    if (!channel || !message || !canReadChat(session.selfRole, channel)) {
      return;
    }
    appendChat(session, channel, message);
    publish(session);
  }
}

function appendChat(
  session: Session,
  channel: "player" | "spectator",
  message: ChatMessageView,
): void {
  if (channel === "player") {
    session.playerChat = [...session.playerChat, message];
    return;
  }
  session.spectatorChat = [...session.spectatorChat, message];
}

function applyMemberRoles(session: Session): void {
  for (const peer of session.peers.values()) {
    const member = session.members.find((entry) => entry.username === peer.username);
    if (member) {
      peer.role = member.role;
    }
  }
}

function bindPeer(session: Session, peerId: string, playerId: string): void {
  const previous = session.peerIdByPlayer.get(playerId);
  if (previous && previous !== peerId) {
    session.playerIdByPeer.delete(previous);
  }
  session.playerIdByPeer.set(peerId, playerId);
  session.peerIdByPlayer.set(playerId, peerId);
}

async function broadcastState(session: Session): Promise<void> {
  await broadcast(session, {
    kind: "state",
    status: session.roomStatus,
    members: jsonClone(session.members),
    hostReady: session.hostReady,
    guestReady: session.guestReady,
    game: session.game ? jsonClone(session.game) : null,
    record: session.record ? jsonClone(session.record) : null,
  }, connectedPeerIds(session));
}

async function broadcast(session: Session, message: JsonValue, targets: string[]): Promise<void> {
  if (session.meshClosed) {
    return;
  }
  await session.mesh.broadcast(message, targets);
}

function connectedPeerIds(session: Session): string[] {
  return [...session.peers.values()]
    .filter((peer) => peer.link === "connected")
    .map((peer) => peer.peerId);
}

function hostPeerId(session: Session): string | null {
  for (const peer of session.peers.values()) {
    if (peer.role === "HOST" && peer.link === "connected") {
      return peer.peerId;
    }
  }
  for (const [peerId, intro] of session.intros) {
    if (intro.role === "HOST") {
      return peerId;
    }
  }
  return null;
}

function requireHostPeer(session: Session): string {
  const hostId = hostPeerId(session);
  if (!hostId) {
    throw new RoomConnectionError(HOST_DISCONNECTED);
  }
  return hostId;
}

function requireSession(): Session {
  const session = currentSession;
  if (
    !session ||
    session.hidden ||
    session.linkStatus === "closed" ||
    session.linkStatus === "failed"
  ) {
    throw new RoomConnectionError("Could not connect to the room.");
  }
  return session;
}

async function runHandshake(
  session: Session,
  peerId: string,
  send: (data: Record<string, string | number>) => Promise<void>,
  receive: () => Promise<{ data: unknown }>,
  isInitiator: boolean,
): Promise<void> {
  const localIntro = {
    kind: "intro",
    role: session.selfRole,
    username: session.selfUsername,
    roomName: session.name,
    openedAt: session.openedAt,
  };

  const remoteIntro = isInitiator
    ? await exchangeIntro(send, receive, localIntro, true)
    : await exchangeIntro(send, receive, localIntro, false);

  if (!remoteIntro) {
    throw new Error("Invalid room handshake.");
  }

  session.intros.set(peerId, remoteIntro);
  if (remoteIntro.role === "HOST" && remoteIntro.roomName) {
    session.name = remoteIntro.roomName;
  }

  if (session.selfRole === "HOST" && remoteIntro.role === "HOST") {
    const weStay =
      session.openedAt < remoteIntro.openedAt ||
      (session.openedAt === remoteIntro.openedAt && session.selfId < peerId);
    if (!weStay) {
      failSession(session, HOST_TAKEN);
    }
    throw new Error(HOST_TAKEN);
  }

  if (session.selfRole === "HOST") {
    const full = remotePeerCount(session) >= MAX_REMOTE_PEERS;
    if (!full) {
      session.reserved.set(peerId, "SPECTATOR");
    }
    await send({
      kind: "verdict",
      ok: full ? 0 : 1,
      reason: full ? ROOM_FULL : "",
      roomName: session.name,
    });
    if (full) {
      throw new Error(ROOM_FULL);
    }
    return;
  }

  if (remoteIntro.role === "HOST") {
    const { data } = await receive();
    const verdict = parseVerdict(data);
    if (!verdict) {
      throw new Error("Invalid room handshake.");
    }
    if (!verdict.ok) {
      failSession(session, verdict.reason || "The host rejected this connection.");
      throw new Error(verdict.reason || "The host rejected this connection.");
    }
    if (verdict.roomName) {
      session.name = verdict.roomName;
    }
  }
}

async function exchangeIntro(
  send: (data: Record<string, string | number>) => Promise<void>,
  receive: () => Promise<{ data: unknown }>,
  localIntro: Record<string, string | number>,
  initiate: boolean,
): Promise<SeatIntro | null> {
  if (initiate) {
    await send(localIntro);
    const { data } = await receive();
    return parseIntro(data);
  }

  const { data } = await receive();
  const remoteIntro = parseIntro(data);
  await send(localIntro);
  return remoteIntro;
}

function handleJoinError(session: Session, details: { peerId: string; error: string }): void {
  // #region agent log
  void logIceSnapshot(session, details.peerId, "join-error", "A", { joinError: details.error });
  // #endregion
  if (session.hidden || session.linkStatus === "closed") {
    return;
  }

  session.reserved.delete(details.peerId);
  const seatReason = seatRejectionReason(details.error);
  if (seatReason) {
    const lostHostRace = seatReason === HOST_TAKEN && session.failureReason === HOST_TAKEN;
    if (session.selfRole !== "HOST" || lostHostRace) {
      failSession(session, seatReason);
    }
    return;
  }

  const intro = session.intros.get(details.peerId);
  if (intro?.role === "HOST" && session.selfRole !== "HOST") {
    failSession(session, DIRECT_LINK_FAILURE);
    return;
  }

  markPeerFailed(session, details.peerId, DIRECT_LINK_FAILURE);
}

function handlePeerJoin(session: Session, peerId: string): void {
  if (session.hidden || session.linkStatus === "closed") {
    return;
  }

  const intro = session.intros.get(peerId);
  if (!intro) {
    return;
  }

  session.reserved.delete(peerId);
  session.peers.set(peerId, {
    peerId,
    role: intro.role,
    username: intro.username,
    link: "connected",
    failureReason: null,
  });
  // #region agent log
  agentLog("F", "room-connection.ts:handlePeerJoin", "peer joined", {
    selfRole: session.selfRole,
    remoteRole: intro.role,
    peerCount: session.peers.size,
  });
  // #endregion
  watchIce(session, peerId);

  if (session.linkStatus !== "failed") {
    refreshLinkStatus(session);
  }
  publish(session);

  if (session.selfRole !== "HOST" && intro.role === "HOST") {
    void requestLobbyJoin(session, peerId);
  }
}

function handlePeerLeave(session: Session, peerId: string): void {
  if (session.hidden || session.linkStatus === "closed") {
    return;
  }

  const peer = session.peers.get(peerId);
  const intro = session.intros.get(peerId);
  const role = peer?.role ?? intro?.role;
  forgetPeer(session, peerId);

  if (session.linkStatus === "failed") {
    publish(session);
    return;
  }

  if (role === "HOST" && session.selfRole !== "HOST") {
    if (!handleHostDepartureForClient(session)) {
      failSession(session, HOST_DISCONNECTED);
    }
    return;
  }

  releaseSeat(session, peerId);
  refreshLinkStatus(session);
  publish(session);
}

function releaseSeat(session: Session, peerId: string): void {
  const playerId = session.playerIdByPeer.get(peerId);
  const mappedPeer = playerId ? session.peerIdByPlayer.get(playerId) : undefined;
  if (!playerId) {
    return;
  }

  session.playerIdByPeer.delete(peerId);
  if (mappedPeer !== peerId) {
    return;
  }

  session.peerIdByPlayer.delete(playerId);
  if (session.selfRole !== "HOST" || !session.record) {
    return;
  }

  const dropped = disconnectMember(session.record, playerId);
  session.record = dropped.room;
  syncFromRecord(session);
  void broadcastState(session);
}

function markPeerFailed(session: Session, peerId: string, message: string): void {
  const existing = session.peers.get(peerId);
  const intro = session.intros.get(peerId);
  const role = existing?.role ?? intro?.role ?? "SPECTATOR";
  const wasConnected = existing?.link === "connected";
  session.reserved.delete(peerId);
  session.peers.set(peerId, {
    peerId,
    role,
    username: existing?.username ?? intro?.username ?? "Unknown peer",
    link: "failed",
    failureReason: message,
  });

  if (role === "HOST" && session.selfRole !== "HOST") {
    if (!handleHostDepartureForClient(session)) {
      failSession(session, wasConnected ? HOST_DISCONNECTED : message);
    }
    return;
  }

  if (wasConnected) {
    releaseSeat(session, peerId);
  }
  publish(session);
}

function handleHostDepartureForClient(session: Session): boolean {
  if (session.selfRole === "SPECTATOR") {
    failSession(session, ROOM_CLOSED);
    return true;
  }
  if (session.selfRole !== "GUEST") {
    return false;
  }
  return promoteGuestToHost(session);
}

function promoteGuestToHost(session: Session): boolean {
  const source = session.cachedRecord;
  if (!source) {
    return false;
  }
  const hostSeat = source.seats.find((entry) => entry.role === "HOST");
  if (!hostSeat) {
    return false;
  }

  try {
    const left = leaveLobby(source, hostSeat.playerId);
    if (left.roomClosed || !left.promotedHostPlayerId) {
      failSession(session, ROOM_CLOSED);
      return true;
    }
    if (left.promotedHostPlayerId !== session.selfPlayerId) {
      return false;
    }
    adoptPromotedHost(session, left.room);
    return true;
  } catch {
    return false;
  }
}

function adoptPromotedHost(session: Session, record: RoomRecord): void {
  session.record = record;
  session.cachedRecord = record;
  session.selfRole = "HOST";
  session.rng = session.rng ?? defaultRng();
  syncFromRecord(session);
}

function watchIce(session: Session, peerId: string): void {
  session.mesh.watchIce(peerId, () => {
    markPeerFailed(session, peerId, DIRECT_LINK_FAILURE);
  });
}

function failSession(session: Session, reason: string): void {
  if (session.hidden || session.linkStatus === "closed" || session.linkStatus === "failed") {
    rejectHostWaiters(session, new RoomConnectionError(session.failureReason ?? reason));
    return;
  }

  session.linkStatus = "failed";
  session.failureReason = reason;
  rejectHostWaiters(session, new RoomConnectionError(reason));
  publish(session);
  void closeMesh(session);
}

function refreshLinkStatus(session: Session): void {
  if (session.linkStatus === "failed" || session.linkStatus === "closed") {
    return;
  }

  const next: RoomLinkStatus = session.selfRole === "HOST"
    ? session.roomStatus === "WAITING" ? "waiting" : "open"
    : [...session.peers.values()].some((peer) => peer.role === "HOST" && peer.link === "connected")
      ? "open"
      : "waiting";

  if (session.linkStatus === "signaling" && (session.selfRole === "HOST" || next !== "open")) {
    return;
  }

  session.linkStatus = next;
}

function remotePeerCount(session: Session): number {
  const ids = new Set<string>();
  for (const peer of session.peers.values()) {
    if (peer.link === "connected") {
      ids.add(peer.peerId);
    }
  }
  for (const peerId of session.reserved.keys()) {
    ids.add(peerId);
  }
  return ids.size;
}

function waitForHost(session: Session): Promise<void> {
  if (session.hostAccepted) {
    return Promise.resolve();
  }
  if (session.linkStatus === "failed") {
    return Promise.reject(
      new RoomConnectionError(session.failureReason ?? "Could not join the room."),
    );
  }

  return new Promise((resolve, reject) => {
    session.hostWaiters.push({ resolve, reject });
    session.hostTimer = setTimeout(() => {
      // #region agent log
      agentLog("C", "room-connection.ts:waitForHost", "host wait expired", {
        selfRole: session.selfRole,
        linkStatus: session.linkStatus,
        peerCount: session.peers.size,
        introRoles: [...session.intros.values()].map((intro) => intro.role),
        peerLinks: [...session.peers.values()].map((peer) => ({
          role: peer.role,
          link: peer.link,
        })),
      });
      // #endregion
      failSession(session, HOST_MISSING);
    }, HOST_WAIT_MS);
  });
}

function resolveHostWaiters(session: Session): void {
  session.hostAccepted = true;
  if (session.hostTimer) {
    clearTimeout(session.hostTimer);
    session.hostTimer = null;
  }
  const waiters = session.hostWaiters.splice(0);
  for (const waiter of waiters) {
    waiter.resolve();
  }
}

function rejectHostWaiters(session: Session, error: RoomConnectionError): void {
  if (session.hostTimer) {
    clearTimeout(session.hostTimer);
    session.hostTimer = null;
  }
  const waiters = session.hostWaiters.splice(0);
  for (const waiter of waiters) {
    waiter.reject(error);
  }
}

function forgetPeer(session: Session, peerId: string): void {
  session.peers.delete(peerId);
  session.reserved.delete(peerId);
  session.intros.delete(peerId);
  session.mesh.unwatchIce(peerId);
}

async function forceClose(session: Session): Promise<void> {
  session.hidden = true;
  session.linkStatus = "closed";
  if (currentSession === session) {
    currentSession = null;
    publish(null);
  }
  rejectHostWaiters(session, new RoomConnectionError("The room connection was closed."));
  await closeMesh(session);
}

async function closeMesh(session: Session): Promise<void> {
  if (session.meshClosed) {
    return;
  }
  session.meshClosed = true;
  session.debugStop?.();
  session.debugStop = null;
  if (session.hostTimer) {
    clearTimeout(session.hostTimer);
    session.hostTimer = null;
  }
  await session.mesh.leave();
}

function publish(session: Session | null): void {
  snapshot = session && !session.hidden ? toSnapshot(session) : null;
  for (const listener of listeners) {
    listener();
  }
}

function toSnapshot(session: Session): RoomConnectionSnapshot {
  return {
    code: session.code,
    name: session.name,
    selfRole: session.selfRole,
    selfUsername: session.selfUsername,
    selfPlayerId: session.selfPlayerId,
    linkStatus: session.linkStatus,
    failureReason: session.failureReason,
    peers: [...session.peers.values()],
    roomStatus: session.roomStatus,
    members: session.members,
    hostReady: session.hostReady,
    guestReady: session.guestReady,
    playerChat: session.playerChat,
    spectatorChat: session.spectatorChat,
    game: session.game,
  };
}

function runExclusive(task: () => Promise<RoomMembershipView>): Promise<RoomMembershipView> {
  if (operation) {
    return operation;
  }

  operation = task().finally(() => {
    operation = null;
  });
  return operation;
}

function loadSeatSecret(code: string): SeatSecret {
  const key = `dirigeant.seat.${code}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SeatSecret>;
      if (parsed.sessionToken && parsed.playerId) {
        return { playerId: parsed.playerId, sessionToken: parsed.sessionToken };
      }
    }
  } catch {
    // Replace an unreadable seat secret with a new one.
  }

  const secret = { playerId: crypto.randomUUID(), sessionToken: crypto.randomUUID() };
  sessionStorage.setItem(key, JSON.stringify(secret));
  return secret;
}

function createRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function normalizeRoomCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
    throw new RoomConnectionError("Enter a room code of 4 to 12 letters or digits.");
  }
  return normalized;
}

function watchDebugIce(session: Session): void {
  const lastState = new Map<string, string>();
  const timer = setInterval(() => {
    if (session.meshClosed || session.hidden) {
      clearInterval(timer);
      return;
    }
    const peers = session.mesh.peerConnections();
    for (const [peerId, connection] of Object.entries(peers)) {
      const state = `${connection.iceGatheringState}|${connection.iceConnectionState}|${connection.connectionState}`;
      if (lastState.get(peerId) === state) {
        continue;
      }
      lastState.set(peerId, state);
      void logIceSnapshot(session, peerId, "ice-state", "A", { transition: state });
    }
  }, 1000);
  session.debugStop = () => clearInterval(timer);
  setTimeout(() => {
    clearInterval(timer);
  }, 30_000);
}

async function logIceSnapshot(
  session: Session,
  peerId: string,
  message: string,
  hypothesisId: string,
  extra: Record<string, unknown>,
): Promise<void> {
  const connection = session.mesh.peerConnection(peerId);
  const counts = { host: 0, srflx: 0, relay: 0, prflx: 0 };
  let selected = false;
  let statsError: string | null = null;
  if (connection) {
    try {
      const stats = await connection.getStats();
      stats.forEach((report) => {
        if (report.type === "local-candidate" && "candidateType" in report) {
          const kind = String(report.candidateType);
          if (kind === "host" || kind === "srflx" || kind === "relay" || kind === "prflx") {
            counts[kind] += 1;
          }
        }
        if (report.type === "candidate-pair" && "state" in report && report.state === "succeeded") {
          selected = true;
        }
      });
    } catch (caught) {
      statsError = caught instanceof Error ? caught.name : "stats-failed";
    }
  }
  agentLog(hypothesisId, "room-connection.ts:ice", message, {
    selfRole: session.selfRole,
    iceConnectionState: connection?.iceConnectionState ?? null,
    connectionState: connection?.connectionState ?? null,
    iceGatheringState: connection?.iceGatheringState ?? null,
    counts,
    selected,
    statsError,
    peerKnown: Boolean(connection),
    ...extra,
  });
}

function parseIntro(data: unknown): SeatIntro | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (record.kind !== "intro") {
    return null;
  }
  if (record.role !== "HOST" && record.role !== "GUEST" && record.role !== "SPECTATOR") {
    return null;
  }
  if (typeof record.username !== "string" || record.username.trim().length === 0) {
    return null;
  }
  if (typeof record.openedAt !== "number" || !Number.isFinite(record.openedAt)) {
    return null;
  }

  return {
    role: record.role,
    username: record.username,
    roomName: typeof record.roomName === "string" ? record.roomName : "",
    openedAt: record.openedAt,
  };
}

function parseVerdict(data: unknown): { ok: boolean; reason: string; roomName: string } | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (record.kind !== "verdict" || (record.ok !== 0 && record.ok !== 1)) {
    return null;
  }

  return {
    ok: record.ok === 1,
    reason: typeof record.reason === "string" ? record.reason : "",
    roomName: typeof record.roomName === "string" ? record.roomName : "",
  };
}

function toConnectionError(caught: unknown): RoomConnectionError {
  if (caught instanceof RoomConnectionError) {
    return caught;
  }
  if (caught instanceof LobbyError) {
    return new RoomConnectionError(caught.message);
  }
  if (caught instanceof Error && caught.message) {
    return new RoomConnectionError(caught.message);
  }
  return new RoomConnectionError("Could not connect to the room.");
}

function actionMessage(caught: unknown): string {
  if (caught instanceof LobbyError || caught instanceof RoomConnectionError || caught instanceof Error) {
    return caught.message || "Could not update the room.";
  }
  return "Could not update the room.";
}

function commandError(result: ActionResult): GameCommandError {
  return new GameCommandError(
    result.code ?? "VALIDATION",
    result.reason || "Could not play that move.",
    result.actualVersion,
  );
}

function toJsonResult(result: ActionResult): JsonValue {
  const payload: Record<string, JsonValue> = { ok: result.ok };
  if (result.reason) {
    payload.reason = result.reason;
  }
  if (result.code) {
    payload.code = result.code;
  }
  if (result.actualVersion !== undefined) {
    payload.actualVersion = result.actualVersion;
  }
  if (result.role) {
    payload.role = result.role;
  }
  if (result.playerId) {
    payload.playerId = result.playerId;
  }
  if (result.roomName) {
    payload.roomName = result.roomName;
  }
  if (result.status) {
    payload.status = result.status;
  }
  if (result.members) {
    payload.members = jsonClone(result.members);
  }
  if (typeof result.hostReady === "boolean") {
    payload.hostReady = result.hostReady;
  }
  if (typeof result.guestReady === "boolean") {
    payload.guestReady = result.guestReady;
  }
  if (result.game) {
    payload.game = jsonClone(result.game);
  }
  return payload;
}

function parseActionResult(data: unknown): ActionResult {
  const record = asRecord(data);
  if (!record) {
    return { ok: false, reason: "Could not update the room." };
  }

  const code = parseRejectionCode(record.code);
  return {
    ok: record.ok === true,
    reason: typeof record.reason === "string" ? record.reason : undefined,
    code: code ?? undefined,
    actualVersion: typeof record.actualVersion === "number" ? record.actualVersion : undefined,
    role: parseRole(record.role) ?? undefined,
    playerId: typeof record.playerId === "string" ? record.playerId : undefined,
    roomName: typeof record.roomName === "string" ? record.roomName : undefined,
    status: parseStatus(record.status) ?? undefined,
    members: parseMembers(record.members) ?? undefined,
    hostReady: typeof record.hostReady === "boolean" ? record.hostReady : undefined,
    guestReady: typeof record.guestReady === "boolean" ? record.guestReady : undefined,
    game: parseGameState(record.game),
  };
}

function parseCommand(data: unknown): GameCommandRequest | null {
  const record = asRecord(data);
  if (!record || typeof record.expectedVersion !== "number") {
    return null;
  }
  if (
    record.type !== "DEFAULT_MOVE" &&
    record.type !== "END_ACTION_PHASE" &&
    record.type !== "RECRUIT" &&
    record.type !== "ACTIVE_ABILITY"
  ) {
    return null;
  }

  const command: GameCommandRequest = {
    type: record.type,
    expectedVersion: record.expectedVersion,
  };
  if (typeof record.pieceId === "string") {
    command.pieceId = record.pieceId;
  }
  if (typeof record.targetCellId === "number") {
    command.targetCellId = record.targetCellId;
  }
  if (typeof record.offerIndex === "number") {
    command.offerIndex = record.offerIndex;
  }
  if (typeof record.actionKey === "string") {
    command.actionKey = record.actionKey;
  }
  if (record.abilityParams && typeof record.abilityParams === "object") {
    command.abilityParams = record.abilityParams as Record<string, unknown>;
  }
  return command;
}

function parseGameState(data: unknown): GameState | null {
  const record = asRecord(data);
  if (!record || typeof record.gameId !== "string" || typeof record.version !== "number") {
    return null;
  }
  if (!Array.isArray(record.activeAbilityBlockedThisPhase)) {
    record.activeAbilityBlockedThisPhase = [];
  }
  return record as unknown as GameState;
}

function parseChatMessage(data: unknown): ChatMessageView | null {
  const record = asRecord(data);
  const role = record ? parseRole(record.senderRole) : null;
  if (
    !record ||
    !role ||
    typeof record.senderPlayerId !== "string" ||
    typeof record.senderUsername !== "string" ||
    typeof record.text !== "string" ||
    typeof record.sentAt !== "string"
  ) {
    return null;
  }
  return {
    senderPlayerId: record.senderPlayerId,
    senderUsername: record.senderUsername,
    senderRole: role,
    text: record.text,
    sentAt: record.sentAt,
  };
}

function parseRoomRecord(data: unknown): RoomRecord | null {
  const record = asRecord(data);
  if (!record || typeof record.code !== "string" || typeof record.name !== "string") {
    return null;
  }
  const status = parseStatus(record.status);
  if (!status || !Array.isArray(record.seats)) {
    return null;
  }

  const seats: RoomRecord["seats"] = [];
  for (const entry of record.seats) {
    const seat = asRecord(entry);
    const role = seat ? parseRole(seat.role) : null;
    if (
      !seat ||
      !role ||
      typeof seat.playerId !== "string" ||
      typeof seat.username !== "string" ||
      typeof seat.sessionToken !== "string" ||
      typeof seat.joinedAt !== "number"
    ) {
      return null;
    }
    seats.push({
      playerId: seat.playerId,
      username: seat.username,
      role,
      sessionToken: seat.sessionToken,
      joinedAt: seat.joinedAt,
    });
  }

  const readyByPlayerId: Record<string, boolean> = {};
  const readyRecord = asRecord(record.readyByPlayerId);
  if (readyRecord) {
    for (const [key, value] of Object.entries(readyRecord)) {
      if (typeof value === "boolean") {
        readyByPlayerId[key] = value;
      }
    }
  }

  return {
    code: record.code,
    name: record.name,
    status,
    seats,
    readyByPlayerId,
    game: parseGameState(record.game),
  };
}

function parseMembers(data: unknown): RoomMemberView[] | null {
  if (!Array.isArray(data)) {
    return null;
  }
  const members: RoomMemberView[] = [];
  for (const entry of data) {
    const record = asRecord(entry);
    const role = record ? parseRole(record.role) : null;
    if (!record || !role || typeof record.username !== "string") {
      return null;
    }
    members.push({ role, username: record.username });
  }
  return members;
}

function parseRole(value: unknown): RoomRole | null {
  if (value === "HOST" || value === "GUEST" || value === "SPECTATOR") {
    return value;
  }
  return null;
}

function parseStatus(value: unknown): RoomStatus | null {
  if (value === "WAITING" || value === "LOBBY" || value === "IN_GAME" || value === "FINISHED") {
    return value;
  }
  return null;
}

function parseRejectionCode(value: unknown): GameCommandRejectionCode | null {
  if (
    value === "ILLEGAL_MOVE" ||
    value === "STALE_VERSION" ||
    value === "GAME_NOT_FOUND" ||
    value === "VALIDATION"
  ) {
    return value;
  }
  return null;
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as Record<string, unknown>;
}

function jsonClone(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
