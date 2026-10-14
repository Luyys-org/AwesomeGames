import { axialDistance, inferWinCondition, winConditionLabel } from "@/leaders/lib/infer-win-condition";
import { displayUsernameForPlayerId } from "@/leaders/lib/game-view-model";
import { formatPieceTypeName } from "@/leaders/lib/piece-display";
import {
  getStoredPlayerStatsRaw,
  setStoredPlayerStatsRaw,
} from "@/leaders/lib/player-stats-storage";
import type { GameStateView, PieceColor, PieceType } from "@/leaders/services/game.types";
import type { RoomMemberView } from "@/leaders/services/room.types";

import {
  PLAYER_STATS_STORAGE_VERSION,
  type MatchEndStatsView,
  type MatchTravelSession,
  type PieceTravelTotals,
  type PlayerEndMatchStats,
  type PlayerHeaderStatsView,
  type PlayerMatchTravelSummary,
  type StoredPlayerStats,
} from "@/leaders/services/game-data-tracker.types";

const listeners = new Set<() => void>();
let headerStatsSnapshot: PlayerHeaderStatsView = buildHeaderStatsView(emptyStoredStats());
let headerStatsVersion = 0;

function emptyStoredStats(): StoredPlayerStats {
  return {
    version: PLAYER_STATS_STORAGE_VERSION,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalRoundCount: 0,
    mostTraveledTypeCounts: {},
    winConditionCounts: {},
  };
}

function parseStoredStats(raw: string | null): StoredPlayerStats {
  if (!raw) {
    return emptyStoredStats();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlayerStats>;
    if (parsed.version !== PLAYER_STATS_STORAGE_VERSION) {
      return emptyStoredStats();
    }
    return {
      version: PLAYER_STATS_STORAGE_VERSION,
      gamesPlayed: parsed.gamesPlayed ?? 0,
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      totalRoundCount: parsed.totalRoundCount ?? 0,
      mostTraveledTypeCounts: parsed.mostTraveledTypeCounts ?? {},
      winConditionCounts: parsed.winConditionCounts ?? {},
    };
  } catch {
    return emptyStoredStats();
  }
}

function persistStats(stats: StoredPlayerStats): void {
  setStoredPlayerStatsRaw(JSON.stringify(stats));
  headerStatsSnapshot = buildHeaderStatsView(stats);
  headerStatsVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function formatRate(wins: number, games: number): string {
  if (games === 0) {
    return "—";
  }
  return `${Math.round((wins / games) * 100)}%`;
}

function formatAverageRounds(totalRounds: number, games: number): string {
  if (games === 0) {
    return "—";
  }
  const average = totalRounds / games;
  return average >= 10 ? average.toFixed(1) : average.toFixed(2);
}

function favoriteCharacterLabel(stats: StoredPlayerStats): string {
  let bestType: PieceType | null = null;
  let bestCount = 0;
  for (const [type, count] of Object.entries(stats.mostTraveledTypeCounts) as [
    PieceType,
    number,
  ][]) {
    if (count > bestCount) {
      bestCount = count;
      bestType = type;
    }
  }
  if (!bestType || bestCount === 0) {
    return "—";
  }
  return formatPieceTypeName(bestType);
}

function buildHeaderStatsView(stats: StoredPlayerStats): PlayerHeaderStatsView {
  const { gamesPlayed, wins, losses } = stats;
  const hasRecordedGames = gamesPlayed > 0;

  return {
    hasRecordedGames,
    summary: [
      { label: "Games", value: hasRecordedGames ? String(gamesPlayed) : "—" },
      { label: "Wins", value: hasRecordedGames ? String(wins) : "—" },
      { label: "Losses", value: hasRecordedGames ? String(losses) : "—" },
    ],
    details: [
      { label: "Games played", value: hasRecordedGames ? String(gamesPlayed) : "—" },
      { label: "Wins", value: hasRecordedGames ? String(wins) : "—" },
      { label: "Losses", value: hasRecordedGames ? String(losses) : "—" },
      { label: "Win rate", value: formatRate(wins, gamesPlayed) },
      {
        label: "Avg. match length",
        value: formatAverageRounds(stats.totalRoundCount, gamesPlayed),
      },
      { label: "Favorite character", value: favoriteCharacterLabel(stats) },
    ],
  };
}

function mostTraveledForColor(
  session: MatchTravelSession,
  owner: PieceColor,
): PlayerMatchTravelSummary | null {
  let best: PieceTravelTotals | null = null;
  for (const record of Object.values(session.pieceTravel)) {
    if (record.owner !== owner || record.hexesMoved <= 0) {
      continue;
    }
    if (!best || record.hexesMoved > best.hexesMoved) {
      best = record;
    }
  }
  if (!best) {
    return null;
  }
  return {
    pieceType: best.pieceType,
    pieceLabel: formatPieceTypeName(best.pieceType),
    hexesMoved: best.hexesMoved,
  };
}

function playerEndStats(
  game: GameStateView,
  color: PieceColor,
  session: MatchTravelSession,
  roomMembers: RoomMemberView[] | undefined,
): PlayerEndMatchStats {
  const playerId = color === "BLACK" ? game.blackPlayerId : game.whitePlayerId;
  return {
    color,
    playerId,
    displayName: displayUsernameForPlayerId(playerId, game, roomMembers),
    isWinner: game.winnerPlayerId != null && game.winnerPlayerId === playerId,
    mostTraveled: mostTraveledForColor(session, color),
  };
}

export function subscribeGameDataTracker(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGameDataTrackerHeaderSnapshot(): PlayerHeaderStatsView {
  return headerStatsSnapshot;
}

export function getGameDataTrackerHeaderVersion(): number {
  return headerStatsVersion;
}

export class GameDataTracker {
  private stored = emptyStoredStats();
  private session: MatchTravelSession | null = null;
  private recordedMatchIds = new Set<string>();

  constructor() {
    this.stored = parseStoredStats(getStoredPlayerStatsRaw());
    headerStatsSnapshot = buildHeaderStatsView(this.stored);
  }

  getHeaderStats(): PlayerHeaderStatsView {
    return headerStatsSnapshot;
  }

  getSession(): MatchTravelSession | null {
    return this.session;
  }

  beginMatch(game: GameStateView): void {
    this.session = {
      gameId: game.gameId,
      pieceTravel: {},
    };
  }

  recordTransition(previous: GameStateView, next: GameStateView): void {
    if (!this.session || this.session.gameId !== next.gameId) {
      this.beginMatch(next);
    }

    const session = this.session;
    if (!session || next.version <= previous.version) {
      return;
    }

    const previousPieces = previous.pieces ?? {};
    const nextPieces = next.pieces ?? {};

    for (const [pieceId, piece] of Object.entries(nextPieces)) {
      const before = previousPieces[pieceId];
      if (!before || before.cellId === piece.cellId) {
        continue;
      }

      const hexesMoved = axialDistance(before.cellId, piece.cellId);
      const existing = session.pieceTravel[pieceId];
      if (existing) {
        existing.hexesMoved += hexesMoved;
        existing.pieceType = piece.type;
        existing.owner = piece.owner;
      } else {
        session.pieceTravel[pieceId] = {
          pieceId,
          pieceType: piece.type,
          owner: piece.owner,
          hexesMoved,
        };
      }
    }
  }

  buildMatchEndStats(
    game: GameStateView,
    roomMembers: RoomMemberView[] | undefined,
  ): MatchEndStatsView {
    const session = this.session?.gameId === game.gameId ? this.session : { gameId: game.gameId, pieceTravel: {} };
    const winCondition = inferWinCondition(game);

    return {
      turnNumber: game.turnNumber,
      winCondition,
      winConditionLabel: winConditionLabel(winCondition),
      black: playerEndStats(game, "BLACK", session, roomMembers),
      white: playerEndStats(game, "WHITE", session, roomMembers),
    };
  }

  recordMatchResult(game: GameStateView, viewerPlayerId: string | null): void {
    if (game.status !== "WON" || !viewerPlayerId) {
      return;
    }
    if (this.recordedMatchIds.has(game.gameId)) {
      return;
    }

    const isPlayer =
      viewerPlayerId === game.blackPlayerId || viewerPlayerId === game.whitePlayerId;
    if (!isPlayer) {
      return;
    }

    this.recordedMatchIds.add(game.gameId);

    const didWin = game.winnerPlayerId === viewerPlayerId;
    const stats: StoredPlayerStats = {
      ...this.stored,
      mostTraveledTypeCounts: { ...this.stored.mostTraveledTypeCounts },
      winConditionCounts: { ...this.stored.winConditionCounts },
    };
    stats.gamesPlayed += 1;
    stats.totalRoundCount += game.turnNumber;
    if (didWin) {
      stats.wins += 1;
      const condition = inferWinCondition(game);
      stats.winConditionCounts[condition] = (stats.winConditionCounts[condition] ?? 0) + 1;
    } else {
      stats.losses += 1;
    }

    const viewerColor: PieceColor | null =
      viewerPlayerId === game.blackPlayerId
        ? "BLACK"
        : viewerPlayerId === game.whitePlayerId
          ? "WHITE"
          : null;
    if (viewerColor && this.session?.gameId === game.gameId) {
      const traveled = mostTraveledForColor(this.session, viewerColor);
      if (traveled) {
        const type = traveled.pieceType;
        stats.mostTraveledTypeCounts[type] = (stats.mostTraveledTypeCounts[type] ?? 0) + 1;
      }
    }

    this.stored = stats;
    persistStats(stats);
  }
}

let singleton: GameDataTracker | null = null;

export function getGameDataTracker(): GameDataTracker {
  if (!singleton) {
    singleton = new GameDataTracker();
  }
  return singleton;
}

export function buildMatchEndStatsForGame(
  game: GameStateView,
  roomMembers: RoomMemberView[] | undefined,
): MatchEndStatsView {
  return getGameDataTracker().buildMatchEndStats(game, roomMembers);
}
