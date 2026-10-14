const PLAYER_STATS_KEY = "dirigeant.player-stats";

export function getStoredPlayerStatsRaw(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PLAYER_STATS_KEY);
}

export function setStoredPlayerStatsRaw(value: string): void {
  window.localStorage.setItem(PLAYER_STATS_KEY, value);
}
