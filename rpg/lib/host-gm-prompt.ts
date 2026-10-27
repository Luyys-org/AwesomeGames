import { gmLanguageLabel } from "@/rpg/lib/campaign-tab-config";
import {
  DEATH_PENALTIES,
  ENEMY_DIFFICULTIES,
  LOOT_RARITIES,
  PLAYER_FREEDOMS,
  UNIVERSES,
  UNIVERSE_TYPES,
  type CampaignSettings,
} from "@/rpg/lib/campaign-settings";
import { characterIdentity, type CharacterOptions } from "@/rpg/lib/character-options";
import {
  CARRIED_MAX,
  ENCOUNTER_NAME_MAX,
  ENCOUNTER_SUMMARY_MAX,
  gmLootLimits,
  injuryEnabled,
  LOCATION_MAX,
  NARRATION_MAX,
  preferredCheckDifficulty,
  SETUP_MAX,
  type CheckResolution,
  type GmIntent,
} from "@/rpg/lib/gm-turn";
import { renderTemplate } from "@/rpg/lib/prompt-template";
import gmOutcomeRetryTemplate from "@/rpg/prompts/gm-outcome-retry";
import gmOutcomeTemplate from "@/rpg/prompts/gm-outcome";
import gmReactionRetryTemplate from "@/rpg/prompts/gm-reaction-retry";
import gmReactionTemplate from "@/rpg/prompts/gm-reaction";
import openingSituationRetryTemplate from "@/rpg/prompts/opening-situation-retry";
import openingSituationTemplate from "@/rpg/prompts/opening-situation";
import startingLoadoutRetryTemplate from "@/rpg/prompts/starting-loadout-retry";
import startingLoadoutTemplate from "@/rpg/prompts/starting-loadout";
import systemTemplate from "@/rpg/prompts/system";
import { currencyLabel } from "@/rpg/lib/starting-kit";
import type { TableState, TranscriptEntry } from "@/rpg/lib/table";

export function buildGmSystemPrompt(settings: CampaignSettings): string {
  return renderTemplate(systemTemplate, { language: gmLanguageLabel(settings.campaignConfiguration?.language) });
}

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
  return {
    ...campaign,
    campaign,
    language: gmLanguageLabel(settings.campaignConfiguration?.language),
  };
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

const GM_LIMITS = {
  narration: NARRATION_MAX,
  setup: SETUP_MAX,
  encounterName: ENCOUNTER_NAME_MAX,
  encounterSummary: ENCOUNTER_SUMMARY_MAX,
  place: LOCATION_MAX,
  weather: LOCATION_MAX,
  reputation: LOCATION_MAX,
  actionId: 32,
  actionLabel: 48,
  actions: { min: 3, max: 8 },
  itemName: 80,
  carriedMax: CARRIED_MAX,
};

function turnVars(table: TableState, intent: GmIntent, resolution?: CheckResolution): Record<string, unknown> {
  const loot = gmLootLimits(table.settings);
  return {
    ...campaignVars(table.settings),
    situation: table.situation.slice(0, 800),
    place: table.location.place,
    weather: table.location.weather,
    reputation: table.location.reputation,
    scene: table.scene,
    currencyName: currencyLabel(table.settings.universe),
    preferredDifficulty: preferredCheckDifficulty(table.settings),
    injuryEnabled: injuryEnabled(table.settings) ? "on" : "off",
    limits: { ...GM_LIMITS, currencyMax: loot.currencyMax, itemMax: loot.itemMax },
    characters: charactersForGm(table),
    transcript: transcriptForGm(table),
    intent,
    resolution: resolution ?? null,
  };
}

function charactersForGm(table: TableState) {
  const options = table.settings.characterOptions;
  return table.characters
    .filter((character) => !character.archived)
    .map((character) => {
      const identity = characterIdentity(character, options);
      const skillIds = [character.abilityId, character.extraAbilityId].filter((id) => id.length > 0);
      return {
        characterId: character.id,
        name: character.name,
        classLabel: identity.className,
        raceLabel: identity.race,
        inScene: character.inScene,
        wounds: character.wounds,
        currency: character.currency,
        inventory: character.inventory.map((item) => ({ name: item.name, equipped: item.equipped })),
        stats: options.stats.map((stat) => ({
          id: stat.id,
          label: stat.label,
          value: character.stats[stat.id] ?? 0,
        })),
        skills: skillIds.map((id) => {
          const skill = options.skills.find((entry) => entry.id === id);
          return {
            id,
            label: skill?.label ?? id,
            statId: skill?.statId ?? "",
            applies: skill?.applies ?? "",
          };
        }),
      };
    });
}

function transcriptForGm(table: TableState) {
  const names = new Map(table.characters.map((character) => [character.id, character.name]));
  return table.transcript.slice(-20).map((entry) => transcriptLine(entry, names));
}

function transcriptLine(entry: TranscriptEntry, names: Map<string, string>): Record<string, string> {
  if (entry.type === "intent") {
    return {
      type: "intent",
      name: names.get(entry.characterId) ?? "Someone",
      kind: entry.kind,
      text: entry.text,
    };
  }
  if (entry.type === "check") {
    return { type: "check", name: names.get(entry.characterId) ?? "Someone", text: entry.line };
  }
  if (entry.type === "wound") {
    return {
      type: "wound",
      name: names.get(entry.characterId) ?? "Someone",
      text: entry.wounds.join(", ") || "unhurt",
    };
  }
  if (entry.type === "death") {
    return { type: "death", name: names.get(entry.characterId) ?? "Someone", text: entry.penalty };
  }
  if (entry.type === "situation") return { type: "situation", text: entry.text };
  if (entry.type === "narration") return { type: "narration", text: entry.text };
  return { type: "system", text: entry.text };
}

export function buildGmReactionUserMessage(table: TableState, intent: GmIntent): string {
  return renderTemplate(gmReactionTemplate, turnVars(table, intent));
}

export function buildGmReactionRetryMessage(
  table: TableState,
  intent: GmIntent,
  validationError: string,
): string {
  return renderTemplate(gmReactionRetryTemplate, { ...turnVars(table, intent), validationError });
}

export function buildGmOutcomeUserMessage(
  table: TableState,
  intent: GmIntent,
  resolution: CheckResolution,
): string {
  return renderTemplate(gmOutcomeTemplate, turnVars(table, intent, resolution));
}

export function buildGmOutcomeRetryMessage(
  table: TableState,
  intent: GmIntent,
  resolution: CheckResolution,
  validationError: string,
): string {
  return renderTemplate(gmOutcomeRetryTemplate, {
    ...turnVars(table, intent, resolution),
    validationError,
  });
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
