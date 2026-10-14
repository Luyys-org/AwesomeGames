import type { GameWinCondition } from "@/leaders/lib/infer-win-condition";
import type { GameStateView, PieceColor, PieceType } from "@/leaders/services/game.types";

export const PLAYER_STATS_STORAGE_VERSION = 1 as const;

export interface StoredPlayerStats {
  version: typeof PLAYER_STATS_STORAGE_VERSION;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalRoundCount: number;
  mostTraveledTypeCounts: Partial<Record<PieceType, number>>;
  winConditionCounts: Partial<Record<GameWinCondition, number>>;
}

export interface PieceTravelTotals {
  pieceId: string;
  pieceType: PieceType;
  owner: PieceColor;
  hexesMoved: number;
}

export interface MatchTravelSession {
  gameId: string;
  pieceTravel: Record<string, PieceTravelTotals>;
}

export interface PlayerMatchTravelSummary {
  pieceType: PieceType;
  pieceLabel: string;
  hexesMoved: number;
}

export interface PlayerEndMatchStats {
  color: PieceColor;
  playerId: string;
  displayName: string;
  isWinner: boolean;
  mostTraveled: PlayerMatchTravelSummary | null;
}

export interface MatchEndStatsView {
  turnNumber: number;
  winCondition: GameWinCondition;
  winConditionLabel: string;
  black: PlayerEndMatchStats;
  white: PlayerEndMatchStats;
}

export interface PlayerHeaderSummaryStat {
  label: string;
  value: string;
}

export interface PlayerHeaderStatsView {
  summary: readonly PlayerHeaderSummaryStat[];
  details: readonly PlayerHeaderSummaryStat[];
  hasRecordedGames: boolean;
}

export type GameStateTransition = {
  previous: GameStateView;
  next: GameStateView;
};
