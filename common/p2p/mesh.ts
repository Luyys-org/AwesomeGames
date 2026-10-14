import type { JsonValue } from "trystero";

export type { JsonValue };

export class MeshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeshError";
  }
}

export const RELAY_UNREACHABLE = "Could not reach a signaling relay.";

export interface OpenMeshOptions {
  appId: string;
  roomCode: string;
  handshakeTimeoutMs: number;
  relayWaitMs: number;
  requestAction: string;
  feedAction: string;
  onHandshake: (
    peerId: string,
    send: (data: Record<string, string | number>) => Promise<void>,
    receive: () => Promise<{ data: unknown }>,
    isInitiator: boolean,
  ) => Promise<void>;
  onJoinError: (peerId: string, error: string) => void;
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onRequest: (data: JsonValue, peerId: string) => JsonValue | Promise<JsonValue>;
  onMessage: (data: JsonValue) => void;
}

export interface Mesh {
  readonly selfId: string;
  request(
    payload: JsonValue,
    options: { target: string; timeoutMs: number },
  ): Promise<JsonValue>;
  broadcast(payload: JsonValue, targets: string[]): Promise<void>;
  peerConnection(peerId: string): RTCPeerConnection | undefined;
  peerConnections(): Record<string, RTCPeerConnection>;
  watchIce(peerId: string, onFailed: () => void): void;
  unwatchIce(peerId: string): void;
  waitForRelay(isAborted: () => boolean): Promise<void>;
  leave(): Promise<void>;
}

export async function openMesh(options: OpenMeshOptions): Promise<Mesh> {
  const trystero = await import("trystero");
  const iceCleanups = new Map<string, () => void>();
  let closed = false;

  const room = trystero.joinRoom(
    { appId: options.appId },
    options.roomCode,
    {
      handshakeTimeoutMs: options.handshakeTimeoutMs,
      onPeerHandshake: (peerId, send, receive, isInitiator) =>
        options.onHandshake(peerId, send, receive, isInitiator),
      onJoinError: (details) => {
        options.onJoinError(details.peerId, details.error);
      },
    },
  );

  const intent = room.makeAction<JsonValue, JsonValue>(options.requestAction, { kind: "request" });
  const feed = room.makeAction<JsonValue>(options.feedAction);
  intent.onRequest = (data, context) => options.onRequest(data, context.peerId);
  feed.onMessage = (data) => {
    options.onMessage(data);
  };
  room.onPeerJoin = (peerId) => {
    options.onPeerJoin(peerId);
  };
  room.onPeerLeave = (peerId) => {
    options.onPeerLeave(peerId);
  };

  function unwatchIce(peerId: string): void {
    iceCleanups.get(peerId)?.();
    iceCleanups.delete(peerId);
  }

  return {
    selfId: trystero.selfId,
    request(payload, requestOptions) {
      return intent.request(payload, requestOptions);
    },
    async broadcast(payload, targets) {
      if (targets.length === 0 || closed) {
        return;
      }
      try {
        await feed.send(payload, { target: targets });
      } catch {
        // A peer can leave while the update is in flight.
      }
    },
    peerConnection(peerId) {
      return room.getPeers()[peerId];
    },
    peerConnections() {
      return room.getPeers();
    },
    watchIce(peerId, onFailed) {
      const connection = room.getPeers()[peerId];
      if (!connection) {
        return;
      }

      const onState = () => {
        if (connection.iceConnectionState !== "failed") {
          return;
        }
        onFailed();
      };

      connection.addEventListener("iceconnectionstatechange", onState);
      iceCleanups.set(peerId, () => {
        connection.removeEventListener("iceconnectionstatechange", onState);
      });
      if (connection.iceConnectionState === "failed") {
        onState();
      }
    },
    unwatchIce,
    waitForRelay(isAborted) {
      return waitForRelay(() => trystero.getRelaySockets(), options.relayWaitMs, isAborted);
    },
    async leave() {
      if (closed) {
        return;
      }
      closed = true;
      for (const cleanup of iceCleanups.values()) {
        cleanup();
      }
      iceCleanups.clear();
      try {
        await room.leave();
      } catch {
        // The mesh is already gone when the tab or the remote side closes first.
      }
    },
  };
}

function waitForRelay(
  getSockets: () => unknown,
  relayWaitMs: number,
  isAborted: () => boolean,
): Promise<void> {
  const timeoutAt = Date.now() + relayWaitMs;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (isAborted()) {
        clearInterval(timer);
        resolve();
        return;
      }

      const sockets = relaySockets(getSockets);
      if (sockets.some((socket) => socket.readyState === WebSocket.OPEN)) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() >= timeoutAt) {
        clearInterval(timer);
        reject(new MeshError(RELAY_UNREACHABLE));
      }
    }, 200);
  });
}

function relaySockets(getSockets: () => unknown): WebSocket[] {
  const value = getSockets();
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value as Record<string, unknown>).filter(
    (socket): socket is WebSocket => socket instanceof WebSocket,
  );
}
