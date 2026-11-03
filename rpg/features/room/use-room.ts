"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { CharacterDraft } from "@/rpg/lib/character";
import {
  campaignPrepState,
  scheduleCampaignPreparation,
  serverCampaignPrepState,
  subscribeCampaignPrep,
} from "@/rpg/lib/host-campaign-prep";
import { readHostSession } from "@/rpg/lib/host-session";
import {
  getRoomView,
  getServerRoomView,
  hostRoom,
  joinRoom,
  submitCharacter,
  submitChosenAction,
  dismissGmError,
  exportHostCampaignSave,
  submitLevelReward,
  submitSetItemEquipped,
  submitClaim,
  submitReady,
  submitSpeak,
  subscribeRoom,
} from "@/rpg/services/room-connection";

export function useRoom(roomCode: string) {
  const view = useSyncExternalStore(subscribeRoom, getRoomView, getServerRoomView);
  const prep = useSyncExternalStore(
    subscribeCampaignPrep,
    () => campaignPrepState(roomCode),
    serverCampaignPrepState,
  );

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
    prep,
    createCharacter: (draft: CharacterDraft) => submitCharacter(draft),
    claimCharacter: (name: string, claimCode: string) => submitClaim(name, claimCode),
    setReady: (ready: boolean) => submitReady(ready),
    retryPreparation: () => scheduleCampaignPreparation(roomCode),
    submitSpeak: (text: string) => submitSpeak(text),
    submitAction: (actionId: string) => submitChosenAction(actionId),
    dismissGmError: (index: number) => dismissGmError(index),
    setItemEquipped: (itemId: string, equipped: boolean) => submitSetItemEquipped(itemId, equipped),
    chooseLevelReward: (
      choice: { kind: "stat"; statId: string } | { kind: "skill"; skillId: string },
    ) => submitLevelReward(choice),
    exportCampaignSave: () => exportHostCampaignSave(),
  };
}
