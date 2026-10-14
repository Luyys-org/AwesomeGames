"use client";

import { useSyncExternalStore } from "react";

import { getGameDataTracker, subscribeGameDataTracker } from "@/leaders/services/game-data-tracker";

export function usePlayerHeaderStats() {
  return useSyncExternalStore(
    subscribeGameDataTracker,
    () => getGameDataTracker().getHeaderStats(),
    () => getGameDataTracker().getHeaderStats(),
  );
}
