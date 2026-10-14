"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { toGameStateView } from "@/leaders/domain/submit";
import type { GameCommandRequest, GameStateView } from "@/leaders/services/game.types";
import {
  ensureConnected,
  GameCommandError,
  getServerSnapshot,
  getSnapshot,
  requestGameSnapshot,
  RoomConnectionError,
  submitGameCommand,
  subscribe,
  type RoomConnectionSnapshot,
} from "@/leaders/services/room-connection";
import type { RoomMembershipView } from "@/leaders/services/room.types";

export type GameRealtimeConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface UseGameRealtimeOptions {
  membership: RoomMembershipView | null;
  enabled: boolean;
  onGameState: (state: GameStateView) => void;
  onSnapshotTimeout?: () => void;
}

const SNAPSHOT_TIMEOUT_MS = 20_000;

function deriveConnectionStatus(
  enabled: boolean,
  membership: RoomMembershipView | null,
  snapshot: RoomConnectionSnapshot | null,
  connectError: string | null,
): GameRealtimeConnectionStatus {
  if (!enabled || !membership) {
    return "idle";
  }
  if (connectError) {
    return "error";
  }
  if (!snapshot || snapshot.code !== membership.code.toUpperCase()) {
    return "connecting";
  }
  if (snapshot.linkStatus === "failed") {
    return "error";
  }
  return snapshot.linkStatus === "open" || snapshot.game ? "connected" : "connecting";
}

function deriveConnectionError(
  snapshot: RoomConnectionSnapshot | null,
  connectError: string | null,
): string | null {
  if (connectError) {
    return connectError;
  }
  if (snapshot?.linkStatus === "failed") {
    return snapshot.failureReason ?? "Could not connect to the room.";
  }
  return null;
}

export function useGameRealtime({
  membership,
  enabled,
  onGameState,
  onSnapshotTimeout,
}: UseGameRealtimeOptions) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState(false);

  const resyncMinVersionRef = useRef<number | null>(null);
  const hasSnapshotRef = useRef(false);
  const onGameStateRef = useRef(onGameState);
  const onSnapshotTimeoutRef = useRef(onSnapshotTimeout);
  const lastAppliedVersionRef = useRef(-1);

  const connectionStatus = useMemo(
    () => deriveConnectionStatus(enabled, membership, snapshot, connectError),
    [connectError, enabled, membership, snapshot],
  );
  const connectionError = useMemo(
    () => deriveConnectionError(snapshot, connectError),
    [connectError, snapshot],
  );

  const roomCode = membership?.code.toUpperCase() ?? null;
  const snapshotGameVersion =
    enabled &&
    roomCode &&
    snapshot?.code === roomCode &&
    snapshot.game !== null &&
    snapshot.game !== undefined
      ? snapshot.game.version
      : null;

  useEffect(() => {
    onGameStateRef.current = onGameState;
    onSnapshotTimeoutRef.current = onSnapshotTimeout;
  }, [onGameState, onSnapshotTimeout]);

  useEffect(() => {
    lastAppliedVersionRef.current = -1;
    hasSnapshotRef.current = false;
    setHasSnapshot(false);
    if (!enabled) {
      setConnectError(null);
    }
  }, [enabled, roomCode]);

  const handleIncomingState = useCallback((state: GameStateView) => {
    const resyncMinVersion = resyncMinVersionRef.current;
    if (resyncMinVersion !== null && state.version < resyncMinVersion) {
      return;
    }
    if (resyncMinVersion !== null && state.version >= resyncMinVersion) {
      resyncMinVersionRef.current = null;
    }
    if (state.version < lastAppliedVersionRef.current) {
      return;
    }
    if (state.version === lastAppliedVersionRef.current && hasSnapshotRef.current) {
      return;
    }
    lastAppliedVersionRef.current = state.version;
    hasSnapshotRef.current = true;
    setHasSnapshot(true);
    onGameStateRef.current(state);
  }, []);

  useEffect(() => {
    if (!enabled || !membership) {
      return;
    }

    let cancelled = false;
    setConnectError(null);
    ensureConnected(membership).catch((caught: unknown) => {
      if (cancelled) {
        return;
      }
      setConnectError(
        caught instanceof RoomConnectionError
          ? caught.message
          : "Could not connect to the room.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, membership]);

  useEffect(() => {
    if (snapshotGameVersion === null) {
      return;
    }
    if (!snapshot?.game) {
      return;
    }
    handleIncomingState(toGameStateView(snapshot.game));
  }, [handleIncomingState, snapshot, snapshotGameVersion]);

  const requestSnapshot = useCallback(() => {
    void requestGameSnapshot();
  }, []);

  const shouldRequestInitialSnapshot =
    enabled &&
    Boolean(membership) &&
    !hasSnapshot &&
    snapshot?.code === roomCode &&
    !snapshot.game &&
    snapshot.linkStatus !== "failed";

  useEffect(() => {
    if (!shouldRequestInitialSnapshot) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!hasSnapshotRef.current) {
        onSnapshotTimeoutRef.current?.();
      }
    }, SNAPSHOT_TIMEOUT_MS);
    void requestGameSnapshot();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldRequestInitialSnapshot]);

  const sendCommand = useCallback(
    (command: GameCommandRequest): Promise<GameStateView> => {
      return submitGameCommand(command).catch((caught: unknown) => {
        if (
          caught instanceof GameCommandError &&
          caught.code === "STALE_VERSION" &&
          caught.actualVersion !== undefined
        ) {
          resyncMinVersionRef.current = caught.actualVersion;
          void requestGameSnapshot();
        }
        throw caught;
      });
    },
    [],
  );

  return {
    connectionStatus,
    connectionError,
    hasSnapshot,
    sendCommand,
    requestSnapshot,
    isConnected: connectionStatus === "connected",
  };
}
