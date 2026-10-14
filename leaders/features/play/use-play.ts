"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { leadersPaths } from "@/leaders/paths";
import { getRememberedUsername, rememberUsername } from "@/leaders/lib/player-identity";
import { setStoredRoomMembership } from "@/leaders/lib/room-storage";
import {
  createRoom,
  joinRoom,
  RoomConnectionError,
} from "@/leaders/services/room-connection";

export type PlayMode = "create" | "join";

export function usePlay() {
  const router = useRouter();
  const [mode, setMode] = useState<PlayMode>("create");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const remembered = getRememberedUsername();
    if (remembered) {
      setUsername(remembered);
    }
  }, []);

  const switchMode = useCallback((nextMode: PlayMode) => {
    setMode(nextMode);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedUsername = username.trim();
      if (!/^[a-zA-Z0-9_]{3,64}$/.test(trimmedUsername)) {
        throw new RoomConnectionError(
          "Username must be 3-64 characters: letters, digits, underscore",
        );
      }
      rememberUsername(trimmedUsername);

      const membership =
        mode === "create"
          ? await createRoom({ name: roomName.trim(), username: trimmedUsername })
          : await joinRoom({
              code: roomCode.trim().toUpperCase(),
              username: trimmedUsername,
            });

      setStoredRoomMembership(membership);
      router.push(leadersPaths.room(membership.code));
    } catch (caught) {
      if (caught instanceof RoomConnectionError) {
        setError(caught.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, roomCode, roomName, router, username]);

  const updateRoomName = useCallback((value: string) => {
    setRoomName(value);
    setError(null);
  }, []);

  const updateRoomCode = useCallback((value: string) => {
    setRoomCode(value);
    setError(null);
  }, []);

  const updateUsername = useCallback((value: string) => {
    setUsername(value);
    setError(null);
  }, []);

  return {
    mode,
    roomName,
    roomCode,
    username,
    error,
    isSubmitting,
    setRoomName: updateRoomName,
    setRoomCode: updateRoomCode,
    setUsername: updateUsername,
    switchMode,
    submit,
  };
}
