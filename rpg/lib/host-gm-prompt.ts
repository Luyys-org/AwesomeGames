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
import { renderTemplate } from "@/rpg/lib/prompt-template";
import openingSituationRetryTemplate from "@/rpg/prompts/opening-situation-retry";
import openingSituationTemplate from "@/rpg/prompts/opening-situation";
import startingLoadoutRetryTemplate from "@/rpg/prompts/starting-loadout-retry";
import startingLoadoutTemplate from "@/rpg/prompts/starting-loadout";
import systemTemplate from "@/rpg/prompts/system";

export const GM_SYSTEM_PROMPT = renderTemplate(systemTemplate, {});

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

function campaignVars(settings: CampaignSettings): Record<string, unknown> {
  const campaign = serializeCampaignForGm(settings);
  return { ...campaign, campaign };
}

export function buildOpeningSituationUserMessage(settings: CampaignSettings): string {
  return renderTemplate(openingSituationTemplate, campaignVars(settings));
}

export function buildOpeningSituationRetryMessage(
  settings: CampaignSettings,
  validationError: string,
): string {
  return renderTemplate(openingSituationRetryTemplate, {
    ...campaignVars(settings),
    validationError,
  });
}

export interface StartingLoadoutCharacterPrompt {
  characterId: string;
  name: string;
  classLabel: string;
  raceLabel: string;
  currencyMin: number;
  currencyMax: number;
  itemMin: number;
  itemMax: number;
}

function loadoutVars(input: {
  settings: CampaignSettings;
  situation: string;
  place: string;
  currencyName: string;
  characters: StartingLoadoutCharacterPrompt[];
}): Record<string, unknown> {
  return {
    ...campaignVars(input.settings),
    situation: input.situation,
    place: input.place,
    currencyName: input.currencyName,
    characters: input.characters,
  };
}

export function buildStartingLoadoutUserMessage(input: {
  settings: CampaignSettings;
  situation: string;
  place: string;
  currencyName: string;
  characters: StartingLoadoutCharacterPrompt[];
}): string {
  return renderTemplate(startingLoadoutTemplate, loadoutVars(input));
}

export function buildStartingLoadoutRetryMessage(
  input: {
    settings: CampaignSettings;
    situation: string;
    place: string;
    currencyName: string;
    characters: StartingLoadoutCharacterPrompt[];
  },
  validationError: string,
): string {
  return renderTemplate(startingLoadoutRetryTemplate, {
    ...loadoutVars(input),
    validationError,
  });
}
