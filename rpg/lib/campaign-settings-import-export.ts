import { UNIVERSES, UNIVERSE_TYPES } from "@/rpg/lib/campaign-settings";
import {
  type CampaignConfigurationInput,
  type GlobalDifficultyId,
  GLOBAL_DIFFICULTY_OPTIONS,
  storedGmLanguage,
  validateCampaignConfiguration,
} from "@/rpg/lib/campaign-tab-config";
import {
  characterConfigurationToInput,
  parseStoredCharacterConfiguration,
  type CharacterConfigurationInput,
} from "@/rpg/lib/character-tab-config";
import { validateCharacterOptionsDraft, type CharacterOptionsDraft } from "@/rpg/lib/character-options";

export const CAMPAIGN_SETTINGS_EXPORT_VERSION_V1 = 1 as const;
export const CAMPAIGN_SETTINGS_EXPORT_VERSION = 2 as const;

/** @deprecated Use NewCampaignSettingsExport v2 */
export interface CampaignTabSettingsExport {
  version: typeof CAMPAIGN_SETTINGS_EXPORT_VERSION_V1;
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
}

export interface NewCampaignSettingsExport {
  version: typeof CAMPAIGN_SETTINGS_EXPORT_VERSION;
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
  characterConfiguration: CharacterConfigurationInput;
  characterOptionsDraft: CharacterOptionsDraft;
}

export interface ImportedNewCampaignSettings {
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
  characterConfiguration?: CharacterConfigurationInput;
  characterOptionsDraft?: CharacterOptionsDraft;
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalGlobalDifficulty(value: unknown): GlobalDifficultyId | "" {
  if (typeof value !== "string" || value === "") return "";
  return GLOBAL_DIFFICULTY_OPTIONS.some((entry) => entry.id === value)
    ? (value as GlobalDifficultyId)
    : "";
}

function readCampaignConfigurationInput(value: unknown): Check<CampaignConfigurationInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Import JSON is missing campaignConfiguration." };
  }
  const input = {
    language: storedGmLanguage(value.language),
    shortDescription: typeof value.shortDescription === "string" ? value.shortDescription : "",
    campaignTags: Array.isArray(value.campaignTags)
      ? value.campaignTags.filter((entry): entry is CampaignConfigurationInput["campaignTags"][number] =>
          typeof entry === "string",
        )
      : [],
    gmNotes: typeof value.gmNotes === "string" ? value.gmNotes : "",
    enemyDifficulty: typeof value.enemyDifficulty === "string" ? value.enemyDifficulty : "",
    bossDifficulty: typeof value.bossDifficulty === "string" ? value.bossDifficulty : "",
    encounterFrequency: typeof value.encounterFrequency === "string" ? value.encounterFrequency : "",
    healingAvailability: typeof value.healingAvailability === "string" ? value.healingAvailability : "",
    resurrectionAvailability:
      typeof value.resurrectionAvailability === "string" ? value.resurrectionAvailability : "",
    investigationDifficulty:
      typeof value.investigationDifficulty === "string" ? value.investigationDifficulty : "",
    lootRarity: typeof value.lootRarity === "string" ? value.lootRarity : "",
    lootQuantity: typeof value.lootQuantity === "string" ? value.lootQuantity : "",
    currencyAbundance: typeof value.currencyAbundance === "string" ? value.currencyAbundance : "",
    uniqueArtifactFrequency:
      typeof value.uniqueArtifactFrequency === "string" ? value.uniqueArtifactFrequency : "",
    resourceScarcity: typeof value.resourceScarcity === "string" ? value.resourceScarcity : "",
    reputationRewardMultiplier:
      typeof value.reputationRewardMultiplier === "string" ? value.reputationRewardMultiplier : "",
    playerFreedom: typeof value.playerFreedom === "string" ? value.playerFreedom : "",
    fastTravelAvailable: value.fastTravelAvailable === true,
    discoveryImportance: typeof value.discoveryImportance === "string" ? value.discoveryImportance : "",
    randomEncounterFrequency:
      typeof value.randomEncounterFrequency === "string" ? value.randomEncounterFrequency : "",
    sideQuestDensity: typeof value.sideQuestDensity === "string" ? value.sideQuestDensity : "",
    moralChoiceImpact: typeof value.moralChoiceImpact === "string" ? value.moralChoiceImpact : "",
    factionInfluence: value.factionInfluence === true,
    pvpAllowed: value.pvpAllowed === true,
    theftBetweenPlayers: value.theftBetweenPlayers === true,
    secretObjectives: value.secretObjectives === true,
    campaignCanFail: value.campaignCanFail === true,
    missionFailureImpact: typeof value.missionFailureImpact === "string" ? value.missionFailureImpact : "",
    npcMortality: value.npcMortality === true,
    reputationTracking: typeof value.reputationTracking === "string" ? value.reputationTracking : "",
    levelCap:
      typeof value.levelCap === "number" ? String(value.levelCap) : typeof value.levelCap === "string" ? value.levelCap : "",
    milestoneProgression:
      typeof value.milestoneProgression === "number"
        ? String(value.milestoneProgression)
        : typeof value.milestoneProgression === "string"
          ? value.milestoneProgression
          : "",
    experienceGainMultiplier:
      typeof value.experienceGainMultiplier === "string" ? value.experienceGainMultiplier : "",
  } as CampaignConfigurationInput;
  const validated = validateCampaignConfiguration(input);
  if (!validated.ok) return validated;
  return { ok: true, value: input };
}

function readCharacterConfigurationInput(value: unknown): Check<CharacterConfigurationInput> {
  const parsed = parseStoredCharacterConfiguration(value);
  if (!parsed) {
    return { ok: false, error: "Import JSON has an invalid characterConfiguration." };
  }
  return { ok: true, value: characterConfigurationToInput(parsed) };
}

function readCharacterOptionsDraft(
  value: unknown,
  characterConfiguration: CharacterConfigurationInput,
): Check<CharacterOptionsDraft> {
  if (!isRecord(value)) {
    return { ok: false, error: "Import JSON is missing characterOptionsDraft." };
  }

  const draft: CharacterOptionsDraft = {
    statPool: characterConfiguration.pointPool,
    statCap: characterConfiguration.pointCapPerAbility,
    stats: Array.isArray(value.stats) ? (value.stats as CharacterOptionsDraft["stats"]) : [],
    skills: Array.isArray(value.skills) ? (value.skills as CharacterOptionsDraft["skills"]) : [],
    classes: Array.isArray(value.classes) ? (value.classes as CharacterOptionsDraft["classes"]) : [],
    races: Array.isArray(value.races) ? (value.races as CharacterOptionsDraft["races"]) : [],
  };

  return { ok: true, value: draft };
}

function readSharedImportFields(value: Record<string, unknown>): Check<{
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
}> {
  const campaignName =
    typeof value.campaignName === "string" && value.campaignName.trim().length <= 60
      ? value.campaignName.trim()
      : "";
  const objective =
    typeof value.objective === "string" && value.objective.trim().length <= 2000
      ? value.objective.trim()
      : "";

  const universe = typeof value.universe === "string" ? value.universe : "";
  if (universe !== "" && !UNIVERSES.some((entry) => entry.id === universe)) {
    return { ok: false, error: "Import JSON has an invalid universe." };
  }

  const universeLabel = typeof value.universeLabel === "string" ? value.universeLabel.trim() : "";
  if (universeLabel.length > 40) {
    return { ok: false, error: "universeLabel must be 40 characters or fewer." };
  }
  if (universe === "custom" && universeLabel.length === 0) {
    return { ok: false, error: "Custom universe imports need universeLabel." };
  }

  const universeType = typeof value.universeType === "string" ? value.universeType : "";
  if (universe === "custom" && !UNIVERSE_TYPES.some((entry) => entry.id === universeType)) {
    return { ok: false, error: "Custom universe imports need a valid universeType." };
  }
  if (
    universe !== "custom" &&
    universeType !== "" &&
    !UNIVERSE_TYPES.some((entry) => entry.id === universeType)
  ) {
    return { ok: false, error: "Import JSON has an invalid universeType." };
  }

  const campaignConfiguration = readCampaignConfigurationInput(value.campaignConfiguration);
  if (!campaignConfiguration.ok) return campaignConfiguration;

  return {
    ok: true,
    value: {
      globalDifficulty: readOptionalGlobalDifficulty(value.globalDifficulty),
      campaignName,
      universe,
      universeLabel,
      universeType,
      objective,
      campaignConfiguration: campaignConfiguration.value,
    },
  };
}

export function buildNewCampaignSettingsExport(input: {
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
  characterConfiguration: CharacterConfigurationInput;
  characterOptionsDraft: CharacterOptionsDraft;
}): NewCampaignSettingsExport {
  return {
    version: CAMPAIGN_SETTINGS_EXPORT_VERSION,
    globalDifficulty: input.globalDifficulty,
    campaignName: input.campaignName,
    universe: input.universe,
    universeLabel: input.universeLabel,
    universeType: input.universeType,
    objective: input.objective,
    campaignConfiguration: input.campaignConfiguration,
    characterConfiguration: input.characterConfiguration,
    characterOptionsDraft: {
      ...input.characterOptionsDraft,
      statPool: input.characterConfiguration.pointPool,
      statCap: input.characterConfiguration.pointCapPerAbility,
    },
  };
}

/** @deprecated Use buildNewCampaignSettingsExport */
export function buildCampaignTabSettingsExport(input: {
  globalDifficulty: GlobalDifficultyId | "";
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  objective: string;
  campaignConfiguration: CampaignConfigurationInput;
}): CampaignTabSettingsExport {
  return {
    version: CAMPAIGN_SETTINGS_EXPORT_VERSION_V1,
    globalDifficulty: input.globalDifficulty,
    campaignName: input.campaignName,
    universe: input.universe,
    universeLabel: input.universeLabel,
    universeType: input.universeType,
    objective: input.objective,
    campaignConfiguration: input.campaignConfiguration,
  };
}

export function parseNewCampaignSettingsImport(value: unknown): Check<ImportedNewCampaignSettings> {
  if (!isRecord(value)) {
    return { ok: false, error: "Import file must be a JSON object." };
  }

  const version = value.version;
  if (version !== CAMPAIGN_SETTINGS_EXPORT_VERSION_V1 && version !== CAMPAIGN_SETTINGS_EXPORT_VERSION) {
    return { ok: false, error: "Import file version is not supported." };
  }

  const shared = readSharedImportFields(value);
  if (!shared.ok) return shared;

  if (version === CAMPAIGN_SETTINGS_EXPORT_VERSION_V1) {
    return { ok: true, value: shared.value };
  }

  const characterConfiguration = readCharacterConfigurationInput(value.characterConfiguration);
  if (!characterConfiguration.ok) return characterConfiguration;

  const characterOptionsDraft = readCharacterOptionsDraft(
    value.characterOptionsDraft,
    characterConfiguration.value,
  );
  if (!characterOptionsDraft.ok) return characterOptionsDraft;

  if (shared.value.universe === "custom") {
    const options = validateCharacterOptionsDraft(characterOptionsDraft.value);
    if (!options.ok) return options;
  }

  return {
    ok: true,
    value: {
      ...shared.value,
      characterConfiguration: characterConfiguration.value,
      characterOptionsDraft: characterOptionsDraft.value,
    },
  };
}

/** @deprecated Use parseNewCampaignSettingsImport */
export function parseCampaignTabSettingsImport(value: unknown): Check<CampaignTabSettingsExport> {
  const parsed = parseNewCampaignSettingsImport(value);
  if (!parsed.ok) return parsed;
  if (parsed.value.characterConfiguration) {
    return { ok: false, error: "Import file version is not supported." };
  }
  return {
    ok: true,
    value: {
      version: CAMPAIGN_SETTINGS_EXPORT_VERSION_V1,
      ...parsed.value,
      campaignConfiguration: parsed.value.campaignConfiguration,
    },
  };
}

export function campaignSettingsExportFilename(campaignName: string): string {
  const slug = campaignName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "campaign"}-settings.json`;
}
