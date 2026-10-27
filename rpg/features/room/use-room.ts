"use client";

import { useEffect, useSyncExternalStore } from "react";

import { readHostSession } from "@/rpg/lib/host-session";
import {
  getRoomView,
  getServerRoomView,
  hostRoom,
  joinRoom,
  submitAct,
  submitCharacter,
  submitClaim,
  submitReady,
  subscribeRoom,
} from "@/rpg/services/room-connection";
import type { CharacterDraft } from "@/rpg/lib/character";

export function useRoom(roomCode: string) {
  const view = useSyncExternalStore(subscribeRoom, getRoomView, getServerRoomView);

  useEffect(() => {
    const session = readHostSession();
    const pending =
      session?.roomCode === roomCode ? hostRoom(roomCode) : joinRoom(roomCode);
    void pending.catch(() => {
      // The room connection publishes the error on the view.
    });
  }, [roomCode]);

  return {
    view,
    createCharacter: (draft: CharacterDraft) => submitCharacter(draft),
    claimCharacter: (name: string, claimCode: string) => submitClaim(name, claimCode),
    setReady: (ready: boolean) => submitReady(ready),
    submitAct: (text: string) => submitAct(text),
  };
}
