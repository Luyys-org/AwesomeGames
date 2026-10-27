import {
  DEATH_PENALTIES,
  ENEMY_DIFFICULTIES,
  LOOT_RARITIES,
  PLAYER_FREEDOMS,
  UNIVERSES,
  UNIVERSE_TYPES,
  type CampaignSettings,
} from "@/rpg/lib/campaign-settings";
import type { CharacterOptions } from "@/rpg/lib/character-options";

export const GM_SYSTEM_PROMPT = [
  "You are the game master and you have no player character.",
  "Use the stats, skills, classes, races, and modifiers from the user message. Do not invent different ones.",
  "Difficulties, wounds, and the death penalty stay as the user message states.",
  "Reply with JSON only, matching the schema in the user message.",
  "Do not write a die result, a total, or a success word.",
  "Do not change the objective, the death penalty, enemy difficulty, loot rarity, player freedom, stats, abilities, or wounds.",
  "Follow the enemy difficulty, loot rarity, and player freedom in the user message. They add no die, item, or wound.",
  "Follow campaignConfiguration and characterConfiguration in the user message for fiction tone, pacing, loot, travel, PvP, NPC rules, and progression.",
  "Player characters are allies. Harm applies only where the user message allows it.",
  "Keep setup and narration inside the character limits in the user message.",
].join(" ");

function choiceLabel<T extends string>(
  id: T,
  options: { id: T; label: string }[],
): string {
  return options.find((entry) => entry.id === id)?.label ?? id;
}

function universeDisplay(settings: CampaignSettings): string {
  if (settings.universe === "custom") return settings.universeLabel ?? "Custom";
  return UNIVERSES.find((entry) => entry.id === settings.universe)?.label ?? settings.universe;
}

function serializeCharacterOptions(options: CharacterOptions): Record<string, unknown> {
  return {
    assignment: options.assignment,
    statPool: options.statPool,
    statCap: options.statCap,
    stats: options.stats.map((stat) => ({
      id: stat.id,
      label: stat.label,
      covers: stat.covers ?? null,
    })),
    skills: options.skills.map((skill) => ({
      id: skill.id,
      label: skill.label,
      statId: skill.statId,
      applies: skill.applies,
    })),
    classes: options.classes.map((entry) => ({ id: entry.id, label: entry.label })),
    races: options.races.map((entry) => ({ id: entry.id, label: entry.label })),
  };
}

export function serializeCampaignForGm(settings: CampaignSettings): Record<string, unknown> {
  return {
    campaignName: settings.campaignName,
    universe: settings.universe,
    universeDisplay: universeDisplay(settings),
    universeLabel: settings.universeLabel,
    universeType: settings.universeType,
    universeTypeLabel: choiceLabel(settings.universeType, UNIVERSE_TYPES),
    playerCount: settings.playerCount,
    objective: settings.objective,
    deathPenalty: settings.deathPenalty,
    deathPenaltyLabel: choiceLabel(settings.deathPenalty, DEATH_PENALTIES),
    enemyDifficulty: settings.enemyDifficulty,
    enemyDifficultyLabel: choiceLabel(settings.enemyDifficulty, ENEMY_DIFFICULTIES),
    lootRarity: settings.lootRarity,
    lootRarityLabel: choiceLabel(settings.lootRarity, LOOT_RARITIES),
    playerFreedom: settings.playerFreedom,
    playerFreedomLabel: choiceLabel(settings.playerFreedom, PLAYER_FREEDOMS),
    campaignConfiguration: settings.campaignConfiguration ?? null,
    characterConfiguration: settings.characterConfiguration ?? null,
    characterOptions: serializeCharacterOptions(settings.characterOptions),
  };
}

export function buildOpeningSituationUserMessage(settings: CampaignSettings): string {
  return JSON.stringify({
    schema: {
      situation: "string",
      place: "string",
      weather: "string",
      reputation: "string",
    },
    limits: { situation: 800, place: 80, weather: 80, reputation: 80 },
    campaign: serializeCampaignForGm(settings),
    task: "Write the opening situation for scene 1. Put the party in the fiction ready to act toward the objective. Also name the place, the weather, and the party's reputation there.",
  });
}

export function buildOpeningSituationRetryMessage(
  settings: CampaignSettings,
  validationError: string,
): string {
  return JSON.stringify({
    schema: {
      situation: "string",
      place: "string",
      weather: "string",
      reputation: "string",
    },
    limits: { situation: 800, place: 80, weather: 80, reputation: 80 },
    validationError,
    campaign: serializeCampaignForGm(settings),
    task: "Fix the JSON and return only { \"situation\", \"place\", \"weather\", \"reputation\" }.",
  });
}
