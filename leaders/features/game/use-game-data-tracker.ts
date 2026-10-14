"use client";

import { useEffect, useRef } from "react";

import { getGameDataTracker } from "@/leaders/services/game-data-tracker";
import type { GameStateView } from "@/leaders/services/game.types";

export function useGameDataTracker(game: GameStateView | null, playerId: string | null): void {
  const previousGameRef = useRef<GameStateView | null>(null);

  useEffect(() => {
    const tracker = getGameDataTracker();

    if (!game) {
      previousGameRef.current = null;
      return;
    }

    const previous = previousGameRef.current;
    if (!previous || previous.gameId !== game.gameId) {
      tracker.beginMatch(game);
    } else if (game.version > previous.version) {
      tracker.recordTransition(previous, game);
    }

    previousGameRef.current = game;

    if (game.status === "WON") {
      tracker.recordMatchResult(game, playerId);
    }
  }, [game, playerId]);
}
