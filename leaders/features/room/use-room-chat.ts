"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import {
  getServerSnapshot,
  getSnapshot,
  RoomConnectionError,
  sendRoomChat,
  subscribe,
} from "@/leaders/services/room-connection";
import type { ChatMessageView, RoomMembershipView } from "@/leaders/services/room.types";

export type RoomChatConnectionStatus = "idle" | "connecting" | "connected" | "error";

export function useRoomChat(membership: RoomMembershipView | null) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [error, setError] = useState<string | null>(null);
  const matches = snapshot !== null && membership !== null && snapshot.code === membership.code.toUpperCase();
  const role = matches ? snapshot.selfRole : membership?.role;

  const messages: ChatMessageView[] = !matches
    ? []
    : role === "SPECTATOR"
      ? [...snapshot.playerChat, ...snapshot.spectatorChat].sort((left, right) =>
          left.sentAt.localeCompare(right.sentAt),
        )
      : snapshot.playerChat;

  const status: RoomChatConnectionStatus = !matches
    ? "connecting"
    : snapshot.linkStatus === "failed"
      ? "error"
      : snapshot.linkStatus === "open"
        ? "connected"
        : snapshot.linkStatus === "closed"
          ? "idle"
          : "connecting";

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    void sendRoomChat(trimmed).catch((caught: unknown) => {
      setError(
        caught instanceof RoomConnectionError
          ? caught.message
          : "Could not send the message.",
      );
    });
  }, []);

  return {
    messages,
    status,
    error,
    sendMessage,
  };
}
