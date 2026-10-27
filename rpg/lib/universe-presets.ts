import {
  DEATH_PENALTIES,
  ENEMY_DIFFICULTIES,
  LOOT_RARITIES,
  PLAYER_COUNTS,
  PLAYER_FREEDOMS,
  UNIVERSES,
  UNIVERSE_TYPES,
} from "@/rpg/lib/campaign-settings";
import { parseCharacterOptions } from "@/rpg/lib/character-options";
import {
  setUniversePresets,
  type UniverseConfig,
} from "@/rpg/lib/universe-preset-cache";

export const UNIVERSE_PRESET_ERROR = "The universe presets could not be loaded.";

const PRESET_IDS = UNIVERSES.map((entry) => entry.id).filter((id) => id !== "custom");

let loading: Promise<void> | null = null;

export function ensureUniversePresets(): Promise<void> {
  loading ??= loadPresets().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

async function loadPresets(): Promise<void> {
  const entries = await Promise.all(
    PRESET_IDS.map(async (id) => {
      const response = await fetch(`/rpg/${id}.json`);
      if (!response.ok) throw new Error(UNIVERSE_PRESET_ERROR);
      const config = parseUniverseConfig(await response.json());
      if (!config) throw new Error(UNIVERSE_PRESET_ERROR);
      return [id, config] as const;
    }),
  );
  setUniversePresets(Object.fromEntries(entries));
}

function parseUniverseConfig(value: unknown): UniverseConfig | null {
  if (!isRecord(value)) return null;
  if (!isListed(value.universeType, UNIVERSE_TYPES)) return null;
  if (!isPlayerCount(value.playerCount)) return null;
  if (!isListed(value.deathPenalty, DEATH_PENALTIES)) return null;
  if (!isListed(value.enemyDifficulty, ENEMY_DIFFICULTIES)) return null;
  if (!isListed(value.lootRarity, LOOT_RARITIES)) return null;
  if (!isListed(value.playerFreedom, PLAYER_FREEDOMS)) return null;
  const characterOptions = parseCharacterOptions(value.characterOptions);
  if (!characterOptions) return null;

  return {
    universeType: value.universeType,
    playerCount: value.playerCount,
    deathPenalty: value.deathPenalty,
    enemyDifficulty: value.enemyDifficulty,
    lootRarity: value.lootRarity,
    playerFreedom: value.playerFreedom,
    characterOptions,
  };
}

function isPlayerCount(value: unknown): value is (typeof PLAYER_COUNTS)[number] {
  return typeof value === "number" && PLAYER_COUNTS.some((count) => count === value);
}

function isListed<T extends string>(value: unknown, options: { id: T }[]): value is T {
  return options.some((entry) => entry.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
