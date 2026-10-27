import type {
  DeathPenaltyId,
  EnemyDifficultyId,
  LootRarityId,
  PlayerFreedomId,
  UniverseTypeId,
} from "@/rpg/lib/campaign-settings";
import type { CharacterOptions } from "@/rpg/lib/character-options";

export interface UniverseConfig {
  universeType: UniverseTypeId;
  playerCount: number;
  deathPenalty: DeathPenaltyId;
  enemyDifficulty: EnemyDifficultyId;
  lootRarity: LootRarityId;
  playerFreedom: PlayerFreedomId;
  characterOptions: CharacterOptions;
}

let presets: Record<string, UniverseConfig> | null = null;

export function setUniversePresets(value: Record<string, UniverseConfig>): void {
  presets = value;
}

export function readUniversePreset(universe: string): UniverseConfig | null {
  return presets?.[universe] ?? null;
}
