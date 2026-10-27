import type { EnemyDifficultyId, LootRarityId, PlayerFreedomId } from "@/rpg/lib/campaign-settings";

export type SettingLevel = "low" | "standard" | "high";

export type BossDifficulty = "easy" | "standard" | "hard";

export type MissionFailureImpact = "none" | "low" | "standard" | "high";

export type ReputationTracking = "no" | "character" | "party";

export type CampaignTagId =
  | "survival"
  | "political"
  | "exploration"
  | "horror"
  | "military"
  | "mystery"
  | "intrigue"
  | "comedy"
  | "romance"
  | "heist";

export interface CampaignConfiguration {
  shortDescription: string;
  campaignTags: CampaignTagId[];
  gmNotes: string;
  enemyDifficulty: BossDifficulty;
  bossDifficulty: BossDifficulty;
  encounterFrequency: SettingLevel;
  healingAvailability: SettingLevel;
  resurrectionAvailability: SettingLevel;
  investigationDifficulty: SettingLevel;
  lootRarity: SettingLevel;
  lootQuantity: SettingLevel;
  currencyAbundance: SettingLevel;
  uniqueArtifactFrequency: SettingLevel;
  resourceScarcity: SettingLevel;
  reputationRewardMultiplier: SettingLevel;
  playerFreedom: SettingLevel;
  fastTravelAvailable: boolean;
  discoveryImportance: SettingLevel;
  randomEncounterFrequency: SettingLevel;
  sideQuestDensity: SettingLevel;
  moralChoiceImpact: SettingLevel;
  factionInfluence: boolean;
  pvpAllowed: boolean;
  theftBetweenPlayers: boolean;
  secretObjectives: boolean;
  campaignCanFail: boolean;
  missionFailureImpact: MissionFailureImpact;
  npcMortality: boolean;
  reputationTracking: ReputationTracking;
  levelCap: number;
  milestoneProgression: number;
  experienceGainMultiplier: SettingLevel;
}

export interface CampaignConfigurationInput {
  shortDescription: string;
  campaignTags: CampaignTagId[];
  gmNotes: string;
  enemyDifficulty: BossDifficulty | "";
  bossDifficulty: BossDifficulty | "";
  encounterFrequency: SettingLevel | "";
  healingAvailability: SettingLevel | "";
  resurrectionAvailability: SettingLevel | "";
  investigationDifficulty: SettingLevel | "";
  lootRarity: SettingLevel | "";
  lootQuantity: SettingLevel | "";
  currencyAbundance: SettingLevel | "";
  uniqueArtifactFrequency: SettingLevel | "";
  resourceScarcity: SettingLevel | "";
  reputationRewardMultiplier: SettingLevel | "";
  playerFreedom: SettingLevel | "";
  fastTravelAvailable: boolean;
  discoveryImportance: SettingLevel | "";
  randomEncounterFrequency: SettingLevel | "";
  sideQuestDensity: SettingLevel | "";
  moralChoiceImpact: SettingLevel | "";
  factionInfluence: boolean;
  pvpAllowed: boolean;
  theftBetweenPlayers: boolean;
  secretObjectives: boolean;
  campaignCanFail: boolean;
  missionFailureImpact: MissionFailureImpact | "";
  npcMortality: boolean;
  reputationTracking: ReputationTracking | "";
  levelCap: string;
  milestoneProgression: string;
  experienceGainMultiplier: SettingLevel | "";
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export const CAMPAIGN_TAGS: { id: CampaignTagId; label: string }[] = [
  { id: "survival", label: "Survival" },
  { id: "political", label: "Political" },
  { id: "exploration", label: "Exploration" },
  { id: "horror", label: "Horror" },
  { id: "military", label: "Military" },
  { id: "mystery", label: "Mystery" },
  { id: "intrigue", label: "Intrigue" },
  { id: "comedy", label: "Comedy" },
  { id: "romance", label: "Romance" },
  { id: "heist", label: "Heist" },
];

export const SETTING_LEVELS: { id: SettingLevel; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
];

export const BOSS_DIFFICULTIES: { id: BossDifficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "standard", label: "Standard" },
  { id: "hard", label: "Hard" },
];

export const MISSION_FAILURE_IMPACTS: { id: MissionFailureImpact; label: string }[] = [
  { id: "none", label: "None" },
  { id: "low", label: "Low" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
];

export const REPUTATION_TRACKING_OPTIONS: { id: ReputationTracking; label: string }[] = [
  { id: "no", label: "No" },
  { id: "character", label: "Character based" },
  { id: "party", label: "Party based" },
];

export type GlobalDifficultyId = "easy" | "default" | "hard";

export const GLOBAL_DIFFICULTY_OPTIONS: { id: GlobalDifficultyId; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "default", label: "Default" },
  { id: "hard", label: "Hard" },
];

type CampaignDropdownPrefill = Pick<
  CampaignConfigurationInput,
  | "enemyDifficulty"
  | "bossDifficulty"
  | "encounterFrequency"
  | "healingAvailability"
  | "resurrectionAvailability"
  | "investigationDifficulty"
  | "lootRarity"
  | "lootQuantity"
  | "currencyAbundance"
  | "uniqueArtifactFrequency"
  | "resourceScarcity"
  | "reputationRewardMultiplier"
  | "playerFreedom"
  | "discoveryImportance"
  | "randomEncounterFrequency"
  | "sideQuestDensity"
  | "moralChoiceImpact"
  | "missionFailureImpact"
  | "reputationTracking"
  | "experienceGainMultiplier"
>;

const GLOBAL_DIFFICULTY_PREFILLS: Record<GlobalDifficultyId, CampaignDropdownPrefill> = {
  easy: {
    enemyDifficulty: "easy",
    bossDifficulty: "easy",
    encounterFrequency: "low",
    healingAvailability: "high",
    resurrectionAvailability: "high",
    investigationDifficulty: "low",
    lootRarity: "high",
    lootQuantity: "high",
    currencyAbundance: "high",
    uniqueArtifactFrequency: "standard",
    resourceScarcity: "low",
    reputationRewardMultiplier: "standard",
    playerFreedom: "high",
    discoveryImportance: "high",
    randomEncounterFrequency: "low",
    sideQuestDensity: "standard",
    moralChoiceImpact: "standard",
    missionFailureImpact: "low",
    reputationTracking: "party",
    experienceGainMultiplier: "high",
  },
  default: {
    enemyDifficulty: "standard",
    bossDifficulty: "standard",
    encounterFrequency: "standard",
    healingAvailability: "standard",
    resurrectionAvailability: "standard",
    investigationDifficulty: "standard",
    lootRarity: "standard",
    lootQuantity: "standard",
    currencyAbundance: "standard",
    uniqueArtifactFrequency: "standard",
    resourceScarcity: "standard",
    reputationRewardMultiplier: "standard",
    playerFreedom: "standard",
    discoveryImportance: "standard",
    randomEncounterFrequency: "standard",
    sideQuestDensity: "standard",
    moralChoiceImpact: "standard",
    missionFailureImpact: "standard",
    reputationTracking: "party",
    experienceGainMultiplier: "standard",
  },
  hard: {
    enemyDifficulty: "hard",
    bossDifficulty: "hard",
    encounterFrequency: "high",
    healingAvailability: "low",
    resurrectionAvailability: "low",
    investigationDifficulty: "high",
    lootRarity: "low",
    lootQuantity: "low",
    currencyAbundance: "low",
    uniqueArtifactFrequency: "low",
    resourceScarcity: "high",
    reputationRewardMultiplier: "high",
    playerFreedom: "low",
    discoveryImportance: "standard",
    randomEncounterFrequency: "high",
    sideQuestDensity: "low",
    moralChoiceImpact: "high",
    missionFailureImpact: "high",
    reputationTracking: "character",
    experienceGainMultiplier: "low",
  },
};

export function campaignDropdownPrefillFromGlobalDifficulty(
  difficulty: GlobalDifficultyId,
): CampaignDropdownPrefill {
  return GLOBAL_DIFFICULTY_PREFILLS[difficulty];
}

/** Applies global difficulty dropdown values; leaves text, tags, checkboxes, and numeric text fields unchanged. */
export function applyGlobalDifficultyPrefill(
  current: CampaignConfigurationInput,
  difficulty: GlobalDifficultyId,
): CampaignConfigurationInput {
  return {
    ...current,
    ...campaignDropdownPrefillFromGlobalDifficulty(difficulty),
    shortDescription: current.shortDescription,
    campaignTags: current.campaignTags,
    gmNotes: current.gmNotes,
    fastTravelAvailable: current.fastTravelAvailable,
    factionInfluence: current.factionInfluence,
    pvpAllowed: current.pvpAllowed,
    theftBetweenPlayers: current.theftBetweenPlayers,
    secretObjectives: current.secretObjectives,
    campaignCanFail: current.campaignCanFail,
    npcMortality: current.npcMortality,
    levelCap: current.levelCap,
    milestoneProgression: current.milestoneProgression,
  };
}

export function emptyCampaignConfigurationInput(): CampaignConfigurationInput {
  return {
    shortDescription: "",
    campaignTags: [],
    gmNotes: "",
    enemyDifficulty: "",
    bossDifficulty: "",
    encounterFrequency: "",
    healingAvailability: "",
    resurrectionAvailability: "",
    investigationDifficulty: "",
    lootRarity: "",
    lootQuantity: "",
    currencyAbundance: "",
    uniqueArtifactFrequency: "",
    resourceScarcity: "",
    reputationRewardMultiplier: "",
    playerFreedom: "",
    fastTravelAvailable: false,
    discoveryImportance: "",
    randomEncounterFrequency: "",
    sideQuestDensity: "",
    moralChoiceImpact: "",
    factionInfluence: false,
    pvpAllowed: false,
    theftBetweenPlayers: false,
    secretObjectives: false,
    campaignCanFail: false,
    missionFailureImpact: "",
    npcMortality: false,
    reputationTracking: "",
    levelCap: "",
    milestoneProgression: "",
    experienceGainMultiplier: "",
  };
}

function readMultiline(value: string, empty: string, tooLong: string, max: number): Check<string> {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, error: empty };
  if (trimmed.length > max) return { ok: false, error: tooLong };
  return { ok: true, value: trimmed };
}

function readChoice<T extends string>(value: string, options: { id: T }[], error: string): Check<T> {
  const match = options.find((entry) => entry.id === value);
  if (!match) return { ok: false, error };
  return { ok: true, value: match.id };
}

function readPositiveInt(value: string, empty: string, invalid: string, field: string): Check<number> {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, error: empty };
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return { ok: false, error: invalid.replace("{field}", field) };
  return { ok: true, value: parsed };
}

export function validateCampaignConfiguration(
  input: CampaignConfigurationInput,
): Check<CampaignConfiguration> {
  const shortDescription = readMultiline(
    input.shortDescription,
    "Enter a short description.",
    "Short description must be 2000 characters or fewer.",
    2000,
  );
  if (!shortDescription.ok) return shortDescription;

  if (input.campaignTags.length === 0) {
    return { ok: false, error: "Choose at least one campaign tag." };
  }
  const invalidTag = input.campaignTags.find(
    (tag) => !CAMPAIGN_TAGS.some((entry) => entry.id === tag),
  );
  if (invalidTag) return { ok: false, error: "Choose valid campaign tags." };

  const gmNotes = readMultiline(
    input.gmNotes,
    "Enter GM notes.",
    "GM notes must be 4000 characters or fewer.",
    4000,
  );
  if (!gmNotes.ok) return gmNotes;

  const enemyDifficulty = readChoice(input.enemyDifficulty, BOSS_DIFFICULTIES, "Choose enemy difficulty.");
  if (!enemyDifficulty.ok) return enemyDifficulty;

  const bossDifficulty = readChoice(input.bossDifficulty, BOSS_DIFFICULTIES, "Choose boss difficulty.");
  if (!bossDifficulty.ok) return bossDifficulty;

  const encounterFrequency = readChoice(
    input.encounterFrequency,
    SETTING_LEVELS,
    "Choose encounter frequency.",
  );
  if (!encounterFrequency.ok) return encounterFrequency;

  const healingAvailability = readChoice(
    input.healingAvailability,
    SETTING_LEVELS,
    "Choose healing availability.",
  );
  if (!healingAvailability.ok) return healingAvailability;

  const resurrectionAvailability = readChoice(
    input.resurrectionAvailability,
    SETTING_LEVELS,
    "Choose resurrection availability.",
  );
  if (!resurrectionAvailability.ok) return resurrectionAvailability;

  const investigationDifficulty = readChoice(
    input.investigationDifficulty,
    SETTING_LEVELS,
    "Choose investigation difficulty.",
  );
  if (!investigationDifficulty.ok) return investigationDifficulty;

  const lootRarity = readChoice(input.lootRarity, SETTING_LEVELS, "Choose loot rarity.");
  if (!lootRarity.ok) return lootRarity;

  const lootQuantity = readChoice(input.lootQuantity, SETTING_LEVELS, "Choose loot quantity.");
  if (!lootQuantity.ok) return lootQuantity;

  const currencyAbundance = readChoice(
    input.currencyAbundance,
    SETTING_LEVELS,
    "Choose currency abundance.",
  );
  if (!currencyAbundance.ok) return currencyAbundance;

  const uniqueArtifactFrequency = readChoice(
    input.uniqueArtifactFrequency,
    SETTING_LEVELS,
    "Choose unique artifact frequency.",
  );
  if (!uniqueArtifactFrequency.ok) return uniqueArtifactFrequency;

  const resourceScarcity = readChoice(
    input.resourceScarcity,
    SETTING_LEVELS,
    "Choose resource scarcity.",
  );
  if (!resourceScarcity.ok) return resourceScarcity;

  const reputationRewardMultiplier = readChoice(
    input.reputationRewardMultiplier,
    SETTING_LEVELS,
    "Choose reputation reward multiplier.",
  );
  if (!reputationRewardMultiplier.ok) return reputationRewardMultiplier;

  const playerFreedom = readChoice(input.playerFreedom, SETTING_LEVELS, "Choose player freedom.");
  if (!playerFreedom.ok) return playerFreedom;

  const discoveryImportance = readChoice(
    input.discoveryImportance,
    SETTING_LEVELS,
    "Choose discovery importance.",
  );
  if (!discoveryImportance.ok) return discoveryImportance;

  const randomEncounterFrequency = readChoice(
    input.randomEncounterFrequency,
    SETTING_LEVELS,
    "Choose random encounter frequency.",
  );
  if (!randomEncounterFrequency.ok) return randomEncounterFrequency;

  const sideQuestDensity = readChoice(
    input.sideQuestDensity,
    SETTING_LEVELS,
    "Choose side quest density.",
  );
  if (!sideQuestDensity.ok) return sideQuestDensity;

  const moralChoiceImpact = readChoice(
    input.moralChoiceImpact,
    SETTING_LEVELS,
    "Choose moral choice impact.",
  );
  if (!moralChoiceImpact.ok) return moralChoiceImpact;

  const missionFailureImpact = readChoice(
    input.missionFailureImpact,
    MISSION_FAILURE_IMPACTS,
    "Choose mission failure impact.",
  );
  if (!missionFailureImpact.ok) return missionFailureImpact;

  const reputationTracking = readChoice(
    input.reputationTracking,
    REPUTATION_TRACKING_OPTIONS,
    "Choose reputation tracking.",
  );
  if (!reputationTracking.ok) return reputationTracking;

  const levelCap = readPositiveInt(
    input.levelCap,
    "Enter a level cap.",
    "Enter a positive whole number for {field}.",
    "level cap",
  );
  if (!levelCap.ok) return levelCap;

  const milestoneProgression = readPositiveInt(
    input.milestoneProgression,
    "Enter milestone progression.",
    "Enter a positive whole number for {field}.",
    "milestone progression",
  );
  if (!milestoneProgression.ok) return milestoneProgression;

  const experienceGainMultiplier = readChoice(
    input.experienceGainMultiplier,
    SETTING_LEVELS,
    "Choose experience gain multiplier.",
  );
  if (!experienceGainMultiplier.ok) return experienceGainMultiplier;

  return {
    ok: true,
    value: {
      shortDescription: shortDescription.value,
      campaignTags: input.campaignTags,
      gmNotes: gmNotes.value,
      enemyDifficulty: enemyDifficulty.value,
      bossDifficulty: bossDifficulty.value,
      encounterFrequency: encounterFrequency.value,
      healingAvailability: healingAvailability.value,
      resurrectionAvailability: resurrectionAvailability.value,
      investigationDifficulty: investigationDifficulty.value,
      lootRarity: lootRarity.value,
      lootQuantity: lootQuantity.value,
      currencyAbundance: currencyAbundance.value,
      uniqueArtifactFrequency: uniqueArtifactFrequency.value,
      resourceScarcity: resourceScarcity.value,
      reputationRewardMultiplier: reputationRewardMultiplier.value,
      playerFreedom: playerFreedom.value,
      fastTravelAvailable: input.fastTravelAvailable,
      discoveryImportance: discoveryImportance.value,
      randomEncounterFrequency: randomEncounterFrequency.value,
      sideQuestDensity: sideQuestDensity.value,
      moralChoiceImpact: moralChoiceImpact.value,
      factionInfluence: input.factionInfluence,
      pvpAllowed: input.pvpAllowed,
      theftBetweenPlayers: input.theftBetweenPlayers,
      secretObjectives: input.secretObjectives,
      campaignCanFail: input.campaignCanFail,
      missionFailureImpact: missionFailureImpact.value,
      npcMortality: input.npcMortality,
      reputationTracking: reputationTracking.value,
      levelCap: levelCap.value,
      milestoneProgression: milestoneProgression.value,
      experienceGainMultiplier: experienceGainMultiplier.value,
    },
  };
}

export function legacyEnemyDifficultyFromConfig(difficulty: BossDifficulty): EnemyDifficultyId {
  if (difficulty === "easy") return "easy";
  if (difficulty === "hard") return "hard";
  return "standard";
}

export function legacyLootRarityFromConfig(level: SettingLevel): LootRarityId {
  if (level === "low") return "scarce";
  if (level === "high") return "abundant";
  return "common";
}

export function legacyPlayerFreedomFromConfig(level: SettingLevel): PlayerFreedomId {
  if (level === "low") return "narrow";
  if (level === "high") return "open";
  return "guided";
}

export function configEnemyDifficultyFromLegacy(id: EnemyDifficultyId): BossDifficulty {
  if (id === "easy") return "easy";
  if (id === "hard" || id === "severe") return "hard";
  return "standard";
}

export function configLootRarityFromLegacy(id: LootRarityId): SettingLevel {
  if (id === "scarce") return "low";
  if (id === "abundant") return "high";
  return "standard";
}

export function configPlayerFreedomFromLegacy(id: PlayerFreedomId): SettingLevel {
  if (id === "narrow") return "low";
  if (id === "open") return "high";
  return "standard";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStoredString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStoredBool(value: unknown): boolean {
  return value === true;
}

function readStoredTags(value: unknown): CampaignTagId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is CampaignTagId =>
    CAMPAIGN_TAGS.some((tag) => tag.id === entry),
  );
}

export function parseStoredCampaignConfiguration(value: unknown): CampaignConfiguration | null {
  if (!isRecord(value)) return null;
  const input: CampaignConfigurationInput = {
    shortDescription: readStoredString(value.shortDescription),
    campaignTags: readStoredTags(value.campaignTags),
    gmNotes: readStoredString(value.gmNotes),
    enemyDifficulty: readStoredString(value.enemyDifficulty) as CampaignConfigurationInput["enemyDifficulty"],
    bossDifficulty: readStoredString(value.bossDifficulty) as CampaignConfigurationInput["bossDifficulty"],
    encounterFrequency: readStoredString(value.encounterFrequency) as CampaignConfigurationInput["encounterFrequency"],
    healingAvailability: readStoredString(value.healingAvailability) as CampaignConfigurationInput["healingAvailability"],
    resurrectionAvailability: readStoredString(value.resurrectionAvailability) as CampaignConfigurationInput["resurrectionAvailability"],
    investigationDifficulty: readStoredString(value.investigationDifficulty) as CampaignConfigurationInput["investigationDifficulty"],
    lootRarity: readStoredString(value.lootRarity) as CampaignConfigurationInput["lootRarity"],
    lootQuantity: readStoredString(value.lootQuantity) as CampaignConfigurationInput["lootQuantity"],
    currencyAbundance: readStoredString(value.currencyAbundance) as CampaignConfigurationInput["currencyAbundance"],
    uniqueArtifactFrequency: readStoredString(value.uniqueArtifactFrequency) as CampaignConfigurationInput["uniqueArtifactFrequency"],
    resourceScarcity: readStoredString(value.resourceScarcity) as CampaignConfigurationInput["resourceScarcity"],
    reputationRewardMultiplier: readStoredString(value.reputationRewardMultiplier) as CampaignConfigurationInput["reputationRewardMultiplier"],
    playerFreedom: readStoredString(value.playerFreedom) as CampaignConfigurationInput["playerFreedom"],
    fastTravelAvailable: readStoredBool(value.fastTravelAvailable),
    discoveryImportance: readStoredString(value.discoveryImportance) as CampaignConfigurationInput["discoveryImportance"],
    randomEncounterFrequency: readStoredString(value.randomEncounterFrequency) as CampaignConfigurationInput["randomEncounterFrequency"],
    sideQuestDensity: readStoredString(value.sideQuestDensity) as CampaignConfigurationInput["sideQuestDensity"],
    moralChoiceImpact: readStoredString(value.moralChoiceImpact) as CampaignConfigurationInput["moralChoiceImpact"],
    factionInfluence: readStoredBool(value.factionInfluence),
    pvpAllowed: readStoredBool(value.pvpAllowed),
    theftBetweenPlayers: readStoredBool(value.theftBetweenPlayers),
    secretObjectives: readStoredBool(value.secretObjectives),
    campaignCanFail: readStoredBool(value.campaignCanFail),
    missionFailureImpact: readStoredString(value.missionFailureImpact) as CampaignConfigurationInput["missionFailureImpact"],
    npcMortality: readStoredBool(value.npcMortality),
    reputationTracking: readStoredString(value.reputationTracking) as CampaignConfigurationInput["reputationTracking"],
    levelCap: typeof value.levelCap === "number" ? String(value.levelCap) : readStoredString(value.levelCap),
    milestoneProgression:
      typeof value.milestoneProgression === "number"
        ? String(value.milestoneProgression)
        : readStoredString(value.milestoneProgression),
    experienceGainMultiplier: readStoredString(value.experienceGainMultiplier) as CampaignConfigurationInput["experienceGainMultiplier"],
  };
  const result = validateCampaignConfiguration(input);
  return result.ok ? result.value : null;
}
