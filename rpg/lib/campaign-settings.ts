export type UniverseId = "star-wars" | "dungeons-and-dragons" | "alien" | "custom";

export type UniverseTypeId =
  | "fantasy"
  | "science-fiction"
  | "horror"
  | "modern"
  | "historical"
  | "post-apocalyptic";

export type DeathPenaltyId = "wounded" | "out-of-scene" | "new-character";

export type EnemyDifficultyId = "easy" | "standard" | "hard" | "severe";

export type LootRarityId = "scarce" | "uncommon" | "common" | "abundant";

export type PlayerFreedomId = "narrow" | "guided" | "open";

export type CampaignStepId = "universe" | "team" | "game";

export interface CampaignSettings {
  campaignName: string;
  universe: UniverseId;
  universeLabel: string | null;
  universeType: UniverseTypeId;
  playerCount: number;
  objective: string;
  deathPenalty: DeathPenaltyId;
  enemyDifficulty: EnemyDifficultyId;
  lootRarity: LootRarityId;
  playerFreedom: PlayerFreedomId;
}

export interface CampaignSettingsInput {
  campaignName: string;
  universe: string;
  universeLabel: string;
  universeType: string;
  playerCount: string;
  objective: string;
  deathPenalty: string;
  enemyDifficulty: string;
  lootRarity: string;
  playerFreedom: string;
}

export interface UniversePreset {
  universeType: UniverseTypeId;
  playerCount: number;
  deathPenalty: DeathPenaltyId;
  enemyDifficulty: EnemyDifficultyId;
  lootRarity: LootRarityId;
  playerFreedom: PlayerFreedomId;
}

interface Choice<T extends string> {
  id: T;
  label: string;
  description: string;
}

export const CAMPAIGN_STEPS: { id: CampaignStepId; label: string }[] = [
  { id: "universe", label: "Universe" },
  { id: "team", label: "Team" },
  { id: "game", label: "Game" },
];

export const UNIVERSES: { id: UniverseId; label: string }[] = [
  { id: "star-wars", label: "Star Wars" },
  { id: "dungeons-and-dragons", label: "Dungeons & Dragons" },
  { id: "alien", label: "Alien" },
  { id: "custom", label: "Custom" },
];

export const UNIVERSE_TYPES: { id: UniverseTypeId; label: string }[] = [
  { id: "fantasy", label: "Fantasy" },
  { id: "science-fiction", label: "Science fiction" },
  { id: "horror", label: "Horror" },
  { id: "modern", label: "Modern" },
  { id: "historical", label: "Historical" },
  { id: "post-apocalyptic", label: "Post-apocalyptic" },
];

export const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;

export const DEATH_PENALTIES: Choice<DeathPenaltyId>[] = [
  {
    id: "wounded",
    label: "Wounded",
    description:
      "The character stays in the scene and is Down. A successful treat removes only Down. Impaired remains.",
  },
  {
    id: "out-of-scene",
    label: "Out of scene",
    description:
      "The character leaves the scene immediately. At the next scene, they return Hurt and Impaired.",
  },
  {
    id: "new-character",
    label: "New character",
    description:
      "The character is archived and leaves the scene. The name stays reserved. That player creates a replacement, who enters at the next scene.",
  },
];

export const ENEMY_DIFFICULTIES: Choice<EnemyDifficultyId>[] = [
  { id: "easy", label: "Easy", description: "Opposition is a manageable threat. Checks prefer difficulty 8." },
  { id: "standard", label: "Standard", description: "Opposition matches the party. Checks prefer difficulty 10." },
  { id: "hard", label: "Hard", description: "Opposition outmatches the party. Checks prefer difficulty 12." },
  { id: "severe", label: "Severe", description: "Opposition is overwhelming. Checks prefer difficulty 15." },
];

export const LOOT_RARITIES: Choice<LootRarityId>[] = [
  { id: "scarce", label: "Scarce", description: "Useful gear almost never appears." },
  { id: "uncommon", label: "Uncommon", description: "Useful gear is occasional." },
  { id: "common", label: "Common", description: "Useful gear appears at a steady pace." },
  { id: "abundant", label: "Abundant", description: "Useful gear is easy to come by." },
];

export const PLAYER_FREEDOMS: Choice<PlayerFreedomId>[] = [
  {
    id: "narrow",
    label: "Narrow",
    description: "Only actions inside the current situation are permitted.",
  },
  {
    id: "guided",
    label: "Guided",
    description: "Any action the scene can contain is permitted.",
  },
  {
    id: "open",
    label: "Open",
    description: "Any action the character could attempt is permitted. The attempt can still fail.",
  },
];

export const UNIVERSE_PRESETS: Record<Exclude<UniverseId, "custom">, UniversePreset> = {
  "star-wars": {
    universeType: "science-fiction",
    playerCount: 4,
    deathPenalty: "wounded",
    enemyDifficulty: "standard",
    lootRarity: "uncommon",
    playerFreedom: "open",
  },
  "dungeons-and-dragons": {
    universeType: "fantasy",
    playerCount: 4,
    deathPenalty: "new-character",
    enemyDifficulty: "standard",
    lootRarity: "common",
    playerFreedom: "guided",
  },
  alien: {
    universeType: "horror",
    playerCount: 3,
    deathPenalty: "new-character",
    enemyDifficulty: "severe",
    lootRarity: "scarce",
    playerFreedom: "narrow",
  },
};

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function hasLineBreak(value: string): boolean {
  return value.includes("\n") || value.includes("\r");
}

function readTrimmed(
  value: string,
  empty: string,
  broken: string,
  tooLong: string,
  max: number,
): Check<string> {
  if (hasLineBreak(value)) return { ok: false, error: broken };
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

export function universePreset(universe: string): UniversePreset | null {
  if (
    universe === "star-wars" ||
    universe === "dungeons-and-dragons" ||
    universe === "alien"
  ) {
    return UNIVERSE_PRESETS[universe];
  }
  return null;
}

function readUniverseStep(input: CampaignSettingsInput): Check<{
  campaignName: string;
  universe: UniverseId;
  universeLabel: string | null;
  universeType: UniverseTypeId | null;
}> {
  const campaignName = readTrimmed(
    input.campaignName,
    "Enter a campaign name.",
    "Campaign name cannot contain line breaks.",
    "Campaign name must be 60 characters or fewer.",
    60,
  );
  if (!campaignName.ok) return campaignName;

  const universe = readChoice(input.universe, UNIVERSES, "Choose a universe.");
  if (!universe.ok) return universe;

  if (universe.value !== "custom") {
    return {
      ok: true,
      value: {
        campaignName: campaignName.value,
        universe: universe.value,
        universeLabel: null,
        universeType: universePreset(universe.value)?.universeType ?? null,
      },
    };
  }

  const universeLabel = readTrimmed(
    input.universeLabel,
    "Enter a name for the custom universe.",
    "Universe name cannot contain line breaks.",
    "Universe name must be 40 characters or fewer.",
    40,
  );
  if (!universeLabel.ok) return universeLabel;

  const universeType = readChoice(input.universeType, UNIVERSE_TYPES, "Choose a universe type.");
  if (!universeType.ok) return universeType;

  return {
    ok: true,
    value: {
      campaignName: campaignName.value,
      universe: universe.value,
      universeLabel: universeLabel.value,
      universeType: universeType.value,
    },
  };
}

function readTeamStep(input: CampaignSettingsInput): Check<{
  playerCount: number;
  deathPenalty: DeathPenaltyId;
}> {
  if (!PLAYER_COUNTS.some((count) => String(count) === input.playerCount)) {
    return { ok: false, error: "Choose the number of players." };
  }

  const deathPenalty = readChoice(input.deathPenalty, DEATH_PENALTIES, "Choose a death penalty.");
  if (!deathPenalty.ok) return deathPenalty;

  return {
    ok: true,
    value: {
      playerCount: Number(input.playerCount),
      deathPenalty: deathPenalty.value,
    },
  };
}

function readGameStep(input: CampaignSettingsInput): Check<{
  objective: string;
  enemyDifficulty: EnemyDifficultyId;
  lootRarity: LootRarityId;
  playerFreedom: PlayerFreedomId;
}> {
  const objective = readTrimmed(
    input.objective,
    "Enter an objective.",
    "Objective cannot contain line breaks.",
    "Objective must be 280 characters or fewer.",
    280,
  );
  if (!objective.ok) return objective;

  const enemyDifficulty = readChoice(
    input.enemyDifficulty,
    ENEMY_DIFFICULTIES,
    "Choose an enemy difficulty.",
  );
  if (!enemyDifficulty.ok) return enemyDifficulty;

  const lootRarity = readChoice(input.lootRarity, LOOT_RARITIES, "Choose a loot rarity.");
  if (!lootRarity.ok) return lootRarity;

  const playerFreedom = readChoice(
    input.playerFreedom,
    PLAYER_FREEDOMS,
    "Choose how free the players are.",
  );
  if (!playerFreedom.ok) return playerFreedom;

  return {
    ok: true,
    value: {
      objective: objective.value,
      enemyDifficulty: enemyDifficulty.value,
      lootRarity: lootRarity.value,
      playerFreedom: playerFreedom.value,
    },
  };
}

export function validateCampaignStep(
  step: CampaignStepId,
  input: CampaignSettingsInput,
): { ok: true } | { ok: false; error: string } {
  const result =
    step === "universe"
      ? readUniverseStep(input)
      : step === "team"
        ? readTeamStep(input)
        : readGameStep(input);
  if (!result.ok) return result;
  return { ok: true };
}

export function validateCampaignSettings(
  input: CampaignSettingsInput,
): { ok: true; value: CampaignSettings } | { ok: false; error: string } {
  const universe = readUniverseStep(input);
  if (!universe.ok) return universe;
  if (!universe.value.universeType) {
    return { ok: false, error: "Choose a universe type." };
  }

  const team = readTeamStep(input);
  if (!team.ok) return team;

  const game = readGameStep(input);
  if (!game.ok) return game;

  return {
    ok: true,
    value: {
      campaignName: universe.value.campaignName,
      universe: universe.value.universe,
      universeLabel: universe.value.universeLabel,
      universeType: universe.value.universeType,
      playerCount: team.value.playerCount,
      objective: game.value.objective,
      deathPenalty: team.value.deathPenalty,
      enemyDifficulty: game.value.enemyDifficulty,
      lootRarity: game.value.lootRarity,
      playerFreedom: game.value.playerFreedom,
    },
  };
}
