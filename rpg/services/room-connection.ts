import { MeshError, openMesh, type JsonValue, type Mesh } from "@/common/p2p";

import { characterError, findClaim, type CharacterDraft } from "@/rpg/lib/character";
import type { CharacterOptions } from "@/rpg/lib/character-options";
import { markGmUnreadable, removeGmError, type GmIntent } from "@/rpg/lib/gm-turn";
import { readHostAi } from "@/rpg/lib/host-ai";
import { runGmTurn } from "@/rpg/lib/host-gm-turn";
import { generateStartingLoadout } from "@/rpg/lib/host-starting-loadout";
import { readHostSession, writeHostSession } from "@/rpg/lib/host-session";
import { ensureUniversePresets } from "@/rpg/lib/universe-presets";
import { UNIVERSES } from "@/rpg/lib/campaign-settings";
import {
  applyStartingLoadout,
  canStartCampaign,
  commitCharacter,
  commitSceneAction,
  commitSetItemEquipped,
  commitSpeak,
  emptyLocation,
  markLoadoutFailed,
  parseSnapshot,
  setCharacterReady,
  startCampaign,
  toPublicCharacter,
  toSnapshot,
  type PublicCharacter,
  type SceneAction,
  type SceneLocation,
  type TableSnapshot,
  type TableState,
  type TranscriptEntry,
} from "@/rpg/lib/table";

const APP_ID = "app.awesomegames.rpg";
const RELAY_WAIT_MS = 12_000;
const HOST_WAIT_MS = 15_000;
const HANDSHAKE_TIMEOUT_MS = 12_000;
const INTENT_TIMEOUT_MS = 12_000;
const MAX_REMOTE_PEERS = 5;

const HOST_TAKEN = "This room already has a host.";
const ROOM_FULL = "The table is full.";
const HOST_MISSING = "Host is not in this room.";
const HOST_DISCONNECTED = "The host disconnected.";

export interface RoomSeat {
  characterId: string;
  claimCode: string;
  status: "active" | "replaced";
}

export interface RoomView {
  role: "host" | "peer";
  link: "connecting" | "open" | "failed";
  error: string | null;
  roomCode: string;
  campaignName: string | null;
  universeName: string | null;
  universe: TableSnapshot["universe"] | null;
  objective: string | null;
  situation: string | null;
  location: SceneLocation;
  playerCount: number | null;
  characterOptions: CharacterOptions | null;
  phase: "waiting" | "lobby" | "play";
  characters: PublicCharacter[];
  transcript: TranscriptEntry[];
  availableActions: SceneAction[];
  loadoutReady: boolean;
  gmBusy: boolean;
  scene: number | null;
  seat: RoomSeat | null;
  joiningCount: number;
}

interface Intro {
  role: "host" | "peer";
  openedAt: number;
}

interface PeerRecord {
  characterId: string | null;
}

interface StoredSeat {
  characterId: string;
  claimCode: string;
  name: string;
}

interface HostWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

interface Session {
  mesh: Mesh;
  role: "host" | "peer";
  roomCode: string;
  openedAt: number;
  selfId: string;
  table: TableState | null;
  peers: Map<string, PeerRecord>;
  intros: Map<string, Intro>;
  reserved: Set<string>;
  hostPeerId: string | null;
  seat: RoomSeat | null;
  lastSnapshot: TableSnapshot | null;
  lastRevision: number;
  link: RoomView["link"];
  error: string | null;
  hidden: boolean;
  closed: boolean;
  hostAccepted: boolean;
  hostWaiters: HostWaiter[];
  hostTimer: ReturnType<typeof setTimeout> | null;
  claimAttempted: boolean;
  loadoutRequested: boolean;
  gmPending: number;
  gmQueue: Promise<void>;
}

let current: Session | null = null;
let view: RoomView | null = null;
let opening: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function subscribeRoom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRoomView(): RoomView | null {
  return view;
}

export function getServerRoomView(): null {
  return null;
}

export function hostRoom(roomCode: string): Promise<void> {
  return enqueue(() => hostRoomNow(roomCode));
}

export function joinRoom(roomCode: string): Promise<void> {
  return enqueue(() => joinRoomNow(roomCode));
}

function enqueue(task: () => Promise<void>): Promise<void> {
  const previous = opening ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const tracked = run.finally(() => {
    if (opening === tracked) opening = null;
  });
  opening = tracked;
  return run;
}

async function hostRoomNow(roomCode: string): Promise<void> {
  await ensureUniversePresets().catch(() => undefined);
  const saved = readHostSession();
  if (!saved || saved.roomCode !== roomCode) {
    throw new Error("This browser does not have the host game.");
  }

  if (sameOpenSession(roomCode, "host")) return;

  const session = await openSession({
    role: "host",
    roomCode,
    table: saved.table,
    seat: hostSeat(saved.table),
  });
  await finishOpen(session);
  requestStartingLoadout(session);
}

async function joinRoomNow(roomCode: string): Promise<void> {
  await ensureUniversePresets().catch(() => undefined);
  if (sameOpenSession(roomCode, "peer")) return;

  const session = await openSession({
    role: "peer",
    roomCode,
    table: null,
    seat: null,
  });
  await finishOpen(session);
  if (session.role === "peer") await waitForHost(session);
}

export async function submitCharacter(draft: CharacterDraft): Promise<string | null> {
  const session = current;
  if (!session || session.hidden || session.link === "failed") {
    return session?.error ?? "Connecting to the room.";
  }

  if (session.role === "host") {
    if (!session.table) return "This browser does not have the host game.";
    const result = commitCharacter(session.table, draft, "host");
    if (!result.ok) return result.error;
    session.table = result.table;
    session.seat = {
      characterId: result.character.id,
      claimCode: result.character.claimCode,
      status: "active",
    };
    writeHostSession({ roomCode: session.roomCode, table: result.table });
    publish(session);
    void broadcastSnapshot(session);
    return null;
  }

  if (session.seat?.status === "active") return "You already have a character.";
  if (session.seat?.status === "replaced") return "Claim your character to continue.";
  if (!session.hostPeerId) return "Waiting for the host.";

  const options = session.lastSnapshot?.characterOptions ?? null;
  if (!options) return "Waiting for the host.";
  const known = sessionViewCharacters(session);
  const localError = characterError(known, draft, "peer", options);
  if (localError) return localError;

  try {
    const response = await session.mesh.request(draftPayload(draft), {
      target: session.hostPeerId,
      timeoutMs: INTENT_TIMEOUT_MS,
    });
    return applyActionResponse(session, response, draft.name);
  } catch {
    return "The host did not answer.";
  }
}

export async function submitReady(ready: boolean): Promise<string | null> {
  const session = current;
  if (!session || session.hidden || session.link === "failed") {
    return session?.error ?? "Connecting to the room.";
  }
  if (session.seat?.status !== "active") return "Create a character first.";

  if (session.role === "host") {
    if (!session.table) return "This browser does not have the host game.";
    const result = setCharacterReady(session.table, session.seat.characterId, ready);
    if (!result.ok) return result.error;
    session.table = result.table;
    writeHostSession({ roomCode: session.roomCode, table: result.table });
    maybeStartCampaign(session);
    publish(session);
    void broadcastSnapshot(session);
    return null;
  }

  if (!session.hostPeerId) return "Waiting for the host.";
  try {
    const response = await session.mesh.request(
      { type: "ready", ready },
      { target: session.hostPeerId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    return applyActionResponse(session, response, "");
  } catch {
    return "The host did not answer.";
  }
}

export async function submitSpeak(text: string): Promise<string | null> {
  return submitHostOrPeerIntent("speak", text);
}

export async function submitChosenAction(actionId: string): Promise<string | null> {
  return submitHostOrPeerIntent("act", actionId);
}

export async function submitSetItemEquipped(itemId: string, equipped: boolean): Promise<string | null> {
  const session = current;
  if (!session || session.hidden || session.link === "failed") {
    return session?.error ?? "Connecting to the room.";
  }
  if (session.seat?.status !== "active") return "Create a character first.";

  if (session.role === "host") {
    if (!session.table) return "This browser does not have the host game.";
    const result = commitSetItemEquipped(session.table, session.seat.characterId, itemId, equipped);
    if (!result.ok) return result.error;
    rememberTable(session, result.table);
    try {
      await broadcastSnapshot(session);
    } catch {
      // The saved table is sent with the next snapshot.
    }
    return null;
  }

  if (!session.hostPeerId) return "Waiting for the host.";
  try {
    const response = await session.mesh.request(
      { type: "setItemEquipped", itemId, equipped },
      { target: session.hostPeerId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    return applyActionResponse(session, response, "");
  } catch {
    return "The host did not answer.";
  }
}

export async function dismissGmError(index: number): Promise<string | null> {
  const session = current;
  if (!session || session.hidden || session.link === "failed") {
    return session?.error ?? "Connecting to the room.";
  }

  if (session.role === "host") {
    if (!session.table) return "This browser does not have the host game.";
    const next = removeGmError(session.table, index);
    if (!next) return "That message is already gone.";
    rememberTable(session, next);
    try {
      await broadcastSnapshot(session);
    } catch {
      // The saved table is sent with the next snapshot.
    }
    return null;
  }

  if (!session.hostPeerId) return "Waiting for the host.";
  try {
    const response = await session.mesh.request(
      { type: "dismissGmError", index },
      { target: session.hostPeerId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    return applyActionResponse(session, response, "");
  } catch {
    return "The host did not answer.";
  }
}

async function submitHostOrPeerIntent(kind: "speak" | "act", value: string): Promise<string | null> {
  const session = current;
  if (!session || session.hidden || session.link === "failed") {
    return session?.error ?? "Connecting to the room.";
  }
  if (session.seat?.status !== "active") return "Create a character first.";

  if (session.role === "host") {
    if (!session.table) return "This browser does not have the host game.";
    const result =
      kind === "speak"
        ? commitSpeak(session.table, session.seat.characterId, value)
        : commitSceneAction(session.table, session.seat.characterId, value);
    if (!result.ok) return result.error;
    acceptIntent(session, result.table);
    return null;
  }

  if (!session.hostPeerId) return "Waiting for the host.";
  try {
    const response = await session.mesh.request(
      kind === "speak"
        ? { type: "intent", kind: "speak", text: value, targetCharacterId: null }
        : { type: "intent", kind: "act", actionId: value, targetCharacterId: null },
      { target: session.hostPeerId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    return applyActionResponse(session, response, "");
  } catch {
    return "The host did not answer.";
  }
}

export async function submitClaim(name: string, claimCode: string): Promise<string | null> {
  const session = current;
  if (!session || session.role !== "peer" || !session.hostPeerId) {
    return "Waiting for the host.";
  }

  try {
    const response = await session.mesh.request(
      { type: "claim", name, claimCode },
      { target: session.hostPeerId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    return applyActionResponse(session, response, name.trim());
  } catch {
    return "The host did not answer.";
  }
}

async function openSession(input: {
  role: "host" | "peer";
  roomCode: string;
  table: TableState | null;
  seat: RoomSeat | null;
}): Promise<Session> {
  if (current) await forceClose(current);

  const session: Session = {
    mesh: null as unknown as Mesh,
    role: input.role,
    roomCode: input.roomCode,
    openedAt: Date.now(),
    selfId: "",
    table: input.table,
    peers: new Map(),
    intros: new Map(),
    reserved: new Set(),
    hostPeerId: null,
    seat: input.seat,
    lastSnapshot: null,
    lastRevision: input.table?.revision ?? 0,
    link: "connecting",
    error: null,
    hidden: false,
    closed: false,
    hostAccepted: false,
    hostWaiters: [],
    hostTimer: null,
    claimAttempted: false,
    loadoutRequested: false,
    gmPending: 0,
    gmQueue: Promise.resolve(),
  };

  current = session;
  publish(session);

  try {
    session.mesh = await openMesh({
    appId: APP_ID,
    roomCode: input.roomCode,
    handshakeTimeoutMs: HANDSHAKE_TIMEOUT_MS,
    relayWaitMs: RELAY_WAIT_MS,
    requestAction: "rpg-intent",
    feedAction: "rpg-feed",
    onHandshake: (peerId, send, receive, isInitiator) =>
      runHandshake(session, peerId, send, receive, isInitiator),
    onJoinError: (peerId) => {
      session.reserved.delete(peerId);
    },
    onPeerJoin: (peerId) => {
      handlePeerJoin(session, peerId);
    },
    onPeerLeave: (peerId) => {
      handlePeerLeave(session, peerId);
    },
    onRequest: (data, peerId) => handleRequest(session, peerId, data),
    onMessage: (data) => {
      handleFeed(session, data);
    },
  });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not join the room.";
    fail(session, message);
    throw new Error(message);
  }
  session.selfId = session.mesh.selfId;
  return session;
}

async function finishOpen(session: Session): Promise<void> {
  try {
    await session.mesh.waitForRelay(() => session.hidden || session.link === "failed");
    if (session.hidden) return;
    if (session.link === "failed") return;
    if (session.role === "host") {
      session.link = "open";
      publish(session);
    }
  } catch (caught) {
    const message = caught instanceof MeshError ? caught.message : "Could not join the room.";
    fail(session, message);
    throw new Error(message);
  }
}

function sameOpenSession(roomCode: string, role: "host" | "peer"): boolean {
  return (
    current !== null &&
    current.roomCode === roomCode &&
    current.role === role &&
    !current.hidden &&
    !current.closed &&
    current.link !== "failed"
  );
}

function handlePeerJoin(session: Session, peerId: string): void {
  if (session.hidden || session.link === "failed") return;

  session.reserved.delete(peerId);
  if (!session.peers.has(peerId)) {
    session.peers.set(peerId, { characterId: null });
  }
  publish(session);

  const intro = session.intros.get(peerId);
  if (session.role === "peer" && intro?.role === "host") {
    session.hostPeerId = peerId;
    void sendJoin(session, peerId);
  }
}

function handlePeerLeave(session: Session, peerId: string): void {
  if (session.hidden) return;

  const intro = session.intros.get(peerId);
  session.peers.delete(peerId);
  session.intros.delete(peerId);
  session.reserved.delete(peerId);
  session.mesh.unwatchIce(peerId);

  if (intro?.role === "host" && session.role === "peer") {
    fail(session, HOST_DISCONNECTED);
    return;
  }

  publish(session);
  if (session.role === "host") maybeStartCampaign(session);
}

async function sendJoin(session: Session, hostId: string): Promise<void> {
  if (session.hostAccepted || session.role !== "peer") return;

  try {
    const response = await session.mesh.request(
      { type: "join", roomCode: session.roomCode },
      { target: hostId, timeoutMs: INTENT_TIMEOUT_MS },
    );
    if (session.hidden || session.link === "failed") return;
    if (!isRecord(response) || response.ok !== true) {
      fail(session, "The host did not accept this room.");
      return;
    }

    session.hostAccepted = true;
    session.link = "open";
    resolveHostWaiters(session);
    const snapshot = parseSnapshot(response.snapshot);
    if (snapshot) applySnapshot(session, snapshot);
    else publish(session);
  } catch {
    if (!session.hidden && session.link !== "failed") {
      fail(session, HOST_MISSING);
    }
  }
}

function handleRequest(session: Session, peerId: string, data: JsonValue): JsonValue {
  if (session.role !== "host" || !session.table || !isRecord(data) || typeof data.type !== "string") {
    return { ok: false };
  }

  if (data.type === "join") {
    if (data.roomCode !== session.roomCode) return { ok: false };
    if (!session.peers.has(peerId)) session.peers.set(peerId, { characterId: null });
    publish(session);
    return { ok: true, snapshot: toJson(toSnapshot(session.table)) };
  }

  if (data.type === "createCharacter") {
    if (session.peers.get(peerId)?.characterId) {
      return { ok: false, error: "You already have a character." };
    }
    const draft = readDraft(data);
    if (!draft || !session.table) return { ok: false };
    const result = commitCharacter(session.table, draft, "peer");
    if (!result.ok) return { ok: false, error: result.error };

    session.table = result.table;
    const record = session.peers.get(peerId) ?? { characterId: null };
    record.characterId = result.character.id;
    session.peers.set(peerId, record);
    writeHostSession({ roomCode: session.roomCode, table: result.table });
    publish(session);
    void broadcastSnapshot(session);
    return {
      ok: true,
      snapshot: toJson(toSnapshot(result.table)),
      seat: {
        characterId: result.character.id,
        claimCode: result.character.claimCode,
        status: "active",
      },
    };
  }

  if (data.type === "claim") {
    if (typeof data.name !== "string" || typeof data.claimCode !== "string" || !session.table) {
      return { ok: false };
    }
    const character = findClaim(session.table.characters, data.name, data.claimCode);
    if (!character) return { ok: false, error: "That character could not be claimed." };

    for (const [otherId, record] of session.peers) {
      if (otherId !== peerId && record.characterId === character.id) {
        record.characterId = null;
        void session.mesh.broadcast(
          {
            type: "seat",
            characterId: character.id,
            claimCode: character.claimCode,
            status: "replaced",
          },
          [otherId],
        );
      }
    }

    const record = session.peers.get(peerId) ?? { characterId: null };
    record.characterId = character.id;
    session.peers.set(peerId, record);
    publish(session);
    return {
      ok: true,
      seat: { characterId: character.id, claimCode: character.claimCode, status: "active" },
    };
  }

  if (data.type === "ready") {
    if (typeof data.ready !== "boolean") return { ok: false };
    const characterId = session.peers.get(peerId)?.characterId;
    if (!characterId) return { ok: false, error: "Create a character first." };
    const result = setCharacterReady(session.table, characterId, data.ready);
    if (!result.ok) return { ok: false, error: result.error };
    session.table = result.table;
    writeHostSession({ roomCode: session.roomCode, table: result.table });
    maybeStartCampaign(session);
    publish(session);
    void broadcastSnapshot(session);
    return { ok: true, snapshot: toJson(toSnapshot(session.table)) };
  }

  if (data.type === "intent") {
    const characterId = session.peers.get(peerId)?.characterId;
    if (!characterId) return { ok: false, error: "Create a character first." };
    const result =
      data.kind === "speak" && typeof data.text === "string"
        ? commitSpeak(session.table, characterId, data.text)
        : data.kind === "act" && typeof data.actionId === "string"
          ? commitSceneAction(session.table, characterId, data.actionId)
          : null;
    if (!result) return { ok: false };
    if (!result.ok) return { ok: false, error: result.error };
    acceptIntent(session, result.table);
    return { ok: true, snapshot: toJson(toSnapshot(session.table)) };
  }

  if (
    data.type === "setItemEquipped" &&
    typeof data.itemId === "string" &&
    typeof data.equipped === "boolean" &&
    session.table
  ) {
    const characterId = session.peers.get(peerId)?.characterId;
    if (!characterId) return { ok: false, error: "Create a character first." };
    const result = commitSetItemEquipped(session.table, characterId, data.itemId, data.equipped);
    if (!result.ok) return { ok: false, error: result.error };
    rememberTable(session, result.table);
    void broadcastSnapshot(session);
    return { ok: true, snapshot: toJson(toSnapshot(result.table)) };
  }

  if (data.type === "dismissGmError" && typeof data.index === "number" && session.table) {
    const next = removeGmError(session.table, data.index);
    if (!next) return { ok: false, error: "That message is already gone." };
    rememberTable(session, next);
    void broadcastSnapshot(session);
    return { ok: true, snapshot: toJson(toSnapshot(next)) };
  }

  return { ok: false };
}

function acceptIntent(session: Session, table: TableState): void {
  const intent = queuedIntent(table);
  const next = intent ? { ...table, gmBusy: true } : table;
  session.table = next;
  if (intent) {
    session.gmPending += 1;
    const turn = intent;
    session.gmQueue = session.gmQueue.catch(() => undefined).then(() => resolveGmIntent(session, turn));
  }
  writeHostSession({ roomCode: session.roomCode, table: next });
  publish(session);
  void broadcastSnapshot(session);
}

function queuedIntent(table: TableState): GmIntent | null {
  for (let index = table.transcript.length - 1; index >= 0; index -= 1) {
    const entry = table.transcript[index];
    if (!entry || entry.type !== "intent") continue;
    if (entry.kind !== "speak" && entry.kind !== "act") continue;
    const character = table.characters.find((candidate) => candidate.id === entry.characterId);
    return {
      characterId: entry.characterId,
      characterName: character?.name ?? "Someone",
      kind: entry.kind,
      text: entry.text,
      ...(entry.actionId ? { actionId: entry.actionId } : {}),
    };
  }
  return null;
}

async function resolveGmIntent(session: Session, intent: GmIntent): Promise<void> {
  try {
    if (current !== session || session.hidden || !session.table) return;
    const hostAi = readHostAi();
    if (!hostAi) {
      rememberTable(session, markGmUnreadable(session.table, false, "The game master has no model configured."));
      try {
        await broadcastSnapshot(session);
      } catch {
        // The saved table is sent with the next snapshot.
      }
      return;
    }
    const next = await runGmTurn(session.table, hostAi, intent, async (mid) => {
      if (current !== session || session.hidden) return false;
      rememberTable(session, mid);
      await broadcastSnapshot(session);
      return current === session && !session.hidden;
    });
    if (current !== session || session.hidden) return;
    rememberTable(session, next);
    await broadcastSnapshot(session);
  } catch (error) {
    if (current === session && session.table && !session.hidden) {
      const content = error instanceof Error && error.message ? error.message : "The game master returned an unreadable result.";
      rememberTable(session, markGmUnreadable(session.table, false, content));
      try {
        await broadcastSnapshot(session);
      } catch {
        // The saved table is sent with the next snapshot.
      }
    }
  } finally {
    session.gmPending = Math.max(0, session.gmPending - 1);
  }
}

function rememberTable(session: Session, table: TableState): void {
  session.table = table;
  writeHostSession({ roomCode: session.roomCode, table });
  publish(session);
}

function maybeStartCampaign(session: Session): void {
  if (session.role !== "host" || !session.table || session.table.phase !== "lobby") return;
  const joiningCount = [...session.peers.values()].filter((peer) => peer.characterId === null).length;
  if (!canStartCampaign(session.table, joiningCount)) return;
  const started = startCampaign(session.table);
  if (!started.ok) return;
  session.table = started.table;
  writeHostSession({ roomCode: session.roomCode, table: started.table });
  publish(session);
  void broadcastSnapshot(session);
  requestStartingLoadout(session);
}

function requestStartingLoadout(session: Session): void {
  if (session.role !== "host" || !session.table) return;
  if (session.table.phase !== "play" || session.table.loadoutReady || session.loadoutRequested) return;
  session.loadoutRequested = true;
  void fillStartingLoadout(session);
}

async function fillStartingLoadout(session: Session): Promise<void> {
  if (!session.table || session.hidden || session.link === "failed") return;
  const hostAi = readHostAi();
  if (!hostAi) {
    session.table = markLoadoutFailed(session.table);
    writeHostSession({ roomCode: session.roomCode, table: session.table });
    publish(session);
    void broadcastSnapshot(session);
    return;
  }

  const generated = await generateStartingLoadout(session.table, hostAi);
  if (session.hidden || current !== session || !session.table) return;
  if (!generated.ok) {
    session.table = markLoadoutFailed(session.table);
    writeHostSession({ roomCode: session.roomCode, table: session.table });
    publish(session);
    void broadcastSnapshot(session);
    return;
  }

  const applied = applyStartingLoadout(session.table, generated.kits, generated.actions);
  session.table = applied.ok ? applied.table : markLoadoutFailed(session.table);
  writeHostSession({ roomCode: session.roomCode, table: session.table });
  publish(session);
  void broadcastSnapshot(session);
}

function handleFeed(session: Session, data: JsonValue): void {
  if (session.role !== "peer" || !isRecord(data)) return;

  if (data.type === "snapshot") {
    const snapshot = parseSnapshot(data.snapshot);
    if (snapshot) applySnapshot(session, snapshot);
    return;
  }

  if (data.type === "seat") {
    const seat = readSeat(data);
    if (!seat) return;
    session.seat = seat;
    if (seat.status === "replaced") clearStoredSeat(session.roomCode);
    publish(session);
  }
}

function applySnapshot(session: Session, snapshot: TableSnapshot): void {
  if (snapshot.roomCode !== session.roomCode || snapshot.revision <= session.lastRevision) return;
  session.lastRevision = snapshot.revision;
  publish(session, snapshot);
  maybeClaimStoredSeat(session, snapshot);
}

function maybeClaimStoredSeat(session: Session, snapshot: TableSnapshot): void {
  if (session.claimAttempted || session.seat) return;
  const stored = readStoredSeat(session.roomCode);
  if (!stored) return;
  if (!snapshot.characters.some((character) => character.id === stored.characterId)) {
    clearStoredSeat(session.roomCode);
    return;
  }

  session.claimAttempted = true;
  void submitClaim(stored.name, stored.claimCode);
}

function applyActionResponse(session: Session, response: JsonValue, name: string): string | null {
  if (!isRecord(response) || response.ok !== true) {
    return typeof response === "object" && response && "error" in response && typeof response.error === "string"
      ? response.error
      : "The host rejected that.";
  }

  const seat = readSeat(response.seat);
  if (seat) {
    session.seat = seat;
    writeStoredSeat(session.roomCode, { ...seat, name });
  }

  const snapshot = parseSnapshot(response.snapshot);
  if (snapshot) {
    session.lastRevision = snapshot.revision;
    publish(session, snapshot);
  } else {
    publish(session);
  }

  return null;
}

async function broadcastSnapshot(session: Session): Promise<void> {
  if (!session.table) return;
  const snapshot = toSnapshot(session.table);
  if (!snapshot) return;
  const targets = [...session.peers.keys()];
  await session.mesh.broadcast({ type: "snapshot", snapshot: toJson(snapshot) }, targets);
}

async function runHandshake(
  session: Session,
  peerId: string,
  send: (data: Record<string, string | number>) => Promise<void>,
  receive: () => Promise<{ data: unknown }>,
  isInitiator: boolean,
): Promise<void> {
  const local = { kind: "intro", role: session.role, openedAt: session.openedAt };
  const remoteData = isInitiator
    ? await exchange(send, receive, local, true)
    : await exchange(send, receive, local, false);
  const remote = parseIntro(remoteData);
  if (!remote) throw new Error("Invalid room handshake.");

  session.intros.set(peerId, remote);

  if (session.role === "host" && remote.role === "host") {
    const weStay =
      session.openedAt < remote.openedAt ||
      (session.openedAt === remote.openedAt && session.selfId < peerId);
    if (!weStay) fail(session, HOST_TAKEN);
    throw new Error(HOST_TAKEN);
  }

  if (session.role === "host") {
    const full = session.peers.size + session.reserved.size >= MAX_REMOTE_PEERS;
    if (!full) session.reserved.add(peerId);
    await send({ kind: "verdict", ok: full ? 0 : 1, reason: full ? ROOM_FULL : "" });
    if (full) throw new Error(ROOM_FULL);
    return;
  }

  if (remote.role === "host") {
    const { data } = await receive();
    const verdict = parseVerdict(data);
    if (!verdict?.ok) {
      const reason = verdict?.reason || "The host rejected this connection.";
      fail(session, reason);
      throw new Error(reason);
    }
    session.hostPeerId = peerId;
  }
}

async function exchange(
  send: (data: Record<string, string | number>) => Promise<void>,
  receive: () => Promise<{ data: unknown }>,
  local: Record<string, string | number>,
  initiate: boolean,
): Promise<unknown> {
  if (initiate) {
    await send(local);
    const { data } = await receive();
    return data;
  }

  const { data } = await receive();
  await send(local);
  return data;
}

function waitForHost(session: Session): Promise<void> {
  if (session.hostAccepted) return Promise.resolve();
  if (session.link === "failed") {
    return Promise.reject(new Error(session.error ?? HOST_MISSING));
  }

  return new Promise((resolve, reject) => {
    session.hostWaiters.push({ resolve, reject });
    session.hostTimer = setTimeout(() => {
      fail(session, HOST_MISSING);
    }, HOST_WAIT_MS);
  });
}

function resolveHostWaiters(session: Session): void {
  if (session.hostTimer) {
    clearTimeout(session.hostTimer);
    session.hostTimer = null;
  }
  const waiters = session.hostWaiters.splice(0);
  for (const waiter of waiters) waiter.resolve();
}

function rejectHostWaiters(session: Session, error: Error): void {
  if (session.hostTimer) {
    clearTimeout(session.hostTimer);
    session.hostTimer = null;
  }
  const waiters = session.hostWaiters.splice(0);
  for (const waiter of waiters) waiter.reject(error);
}

function fail(session: Session, message: string): void {
  if (session.link === "failed") return;
  session.link = "failed";
  session.error = message;
  publish(session);
  rejectHostWaiters(session, new Error(message));
}

async function forceClose(session: Session): Promise<void> {
  session.hidden = true;
  session.closed = true;
  if (current === session) {
    current = null;
    view = null;
    for (const listener of listeners) listener();
  }
  rejectHostWaiters(session, new Error("The room connection was closed."));
  try {
    if (session.mesh) await session.mesh.leave();
  } catch {
    // The mesh is already gone when the tab closes first.
  }
}

function publish(session: Session, snapshot?: TableSnapshot): void {
  if (current !== session) return;
  if (snapshot) session.lastSnapshot = snapshot;

  const table = session.table;
  const source = session.lastSnapshot;
  view = {
    role: session.role,
    link: session.link,
    error: session.error,
    roomCode: session.roomCode,
    campaignName: source?.campaignName ?? table?.settings.campaignName ?? null,
    universeName: source
      ? universeName(source.universe, source.universeLabel)
      : table
        ? universeName(table.settings.universe, table.settings.universeLabel)
        : null,
    universe: source?.universe ?? table?.settings.universe ?? null,
    objective: source?.objective ?? table?.settings.objective ?? null,
    situation: source?.situation ?? table?.situation ?? null,
    location: source?.location ?? table?.location ?? emptyLocation(),
    playerCount: source?.playerCount ?? table?.settings.playerCount ?? null,
    characterOptions: source?.characterOptions ?? table?.settings.characterOptions ?? null,
    phase: source?.phase ?? table?.phase ?? "waiting",
    characters: source?.characters ?? (table ? table.characters.map(toPublicCharacter) : []),
    transcript: source?.transcript ?? table?.transcript ?? [],
    availableActions: source?.availableActions ?? table?.availableActions ?? [],
    loadoutReady: source?.loadoutReady ?? table?.loadoutReady ?? false,
    gmBusy: source?.gmBusy ?? table?.gmBusy ?? false,
    scene: source?.scene ?? table?.scene ?? null,
    seat: session.seat,
    joiningCount:
      session.role === "host"
        ? [...session.peers.values()].filter((peer) => peer.characterId === null).length
        : 0,
  };

  for (const listener of listeners) listener();
}

function hostSeat(table: TableState): RoomSeat | null {
  const character = table.characters.find((entry) => entry.owner === "host" && !entry.archived);
  if (!character) return null;
  return { characterId: character.id, claimCode: character.claimCode, status: "active" };
}

function sessionViewCharacters(session: Session): PublicCharacter[] {
  return view?.roomCode === session.roomCode ? view.characters : [];
}

function universeName(universe: string, label: string | null): string {
  if (universe === "custom") return label || "Custom";
  return UNIVERSES.find((entry) => entry.id === universe)?.label ?? "Custom";
}

function draftPayload(draft: CharacterDraft): JsonValue {
  return {
    type: "createCharacter",
    name: draft.name,
    abilityId: draft.abilityId,
    extraAbilityId: draft.extraAbilityId,
    classId: draft.classId,
    raceId: draft.raceId,
    raceStatIds: draft.raceStatIds,
    stats: draft.stats,
  };
}

function readDraft(value: Record<string, unknown>): CharacterDraft | null {
  const stats = readStatDraft(value.stats);
  if (
    typeof value.name !== "string" ||
    typeof value.abilityId !== "string" ||
    typeof value.classId !== "string" ||
    typeof value.raceId !== "string" ||
    !stats
  ) {
    return null;
  }

  const picks = readDraftPicks(value.extraAbilityId, value.raceStatIds);
  if (!picks) return null;

  return {
    name: value.name,
    abilityId: value.abilityId,
    extraAbilityId: picks.extraAbilityId,
    classId: value.classId,
    raceId: value.raceId,
    raceStatIds: picks.raceStatIds,
    stats,
  };
}

function readDraftPicks(
  extraAbilityId: unknown,
  raceStatIds: unknown,
): { extraAbilityId: string; raceStatIds: string[] } | null {
  const extra = extraAbilityId === undefined ? "" : extraAbilityId;
  const chosen = raceStatIds === undefined ? [] : raceStatIds;
  if (typeof extra !== "string" || extra.length > 32 || !Array.isArray(chosen) || chosen.length > 2) return null;
  if (chosen.some((entry) => typeof entry !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(entry))) return null;
  return { extraAbilityId: extra, raceStatIds: chosen };
}

function readStatDraft(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length > 6) return null;
  const stats: Record<string, string> = {};
  for (const key of keys) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(key)) return null;
    const entry = value[key];
    if (typeof entry !== "string" || entry.length > 4) return null;
    stats[key] = entry;
  }
  return stats;
}

function readSeat(value: unknown): RoomSeat | null {
  if (!isRecord(value)) return null;
  if (typeof value.characterId !== "string" || typeof value.claimCode !== "string") return null;
  if (value.status !== "active" && value.status !== "replaced") return null;
  return { characterId: value.characterId, claimCode: value.claimCode, status: value.status };
}

function parseIntro(value: unknown): Intro | null {
  if (!isRecord(value) || value.kind !== "intro") return null;
  if (value.role !== "host" && value.role !== "peer") return null;
  if (typeof value.openedAt !== "number") return null;
  return { role: value.role, openedAt: value.openedAt };
}

function parseVerdict(value: unknown): { ok: boolean; reason: string } | null {
  if (!isRecord(value) || value.kind !== "verdict") return null;
  if (value.ok !== 0 && value.ok !== 1) return null;
  return { ok: value.ok === 1, reason: typeof value.reason === "string" ? value.reason : "" };
}

function readStoredSeat(roomCode: string): StoredSeat | null {
  try {
    const raw = sessionStorage.getItem(seatKey(roomCode));
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value)) return null;
    if (
      typeof value.characterId !== "string" ||
      typeof value.claimCode !== "string" ||
      typeof value.name !== "string"
    ) {
      return null;
    }
    return { characterId: value.characterId, claimCode: value.claimCode, name: value.name };
  } catch {
    return null;
  }
}

function writeStoredSeat(roomCode: string, seat: StoredSeat): void {
  sessionStorage.setItem(seatKey(roomCode), JSON.stringify(seat));
}

function clearStoredSeat(roomCode: string): void {
  sessionStorage.removeItem(seatKey(roomCode));
}

function seatKey(roomCode: string): string {
  return `rpg.peer.seat.${roomCode}`;
}

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
