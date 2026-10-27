import type { DeathPenaltyId } from "@/rpg/lib/campaign-settings";
import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import { SETTING_LEVELS } from "@/rpg/lib/campaign-tab-config";

export type DeathRecoveryId = "out-of-scene" | "dead";

export type EquipmentValidationRuleId = "level" | "stats" | "race" | "class";

export interface EquipmentValidationRules {
  level: boolean;
  stats: boolean;
  race: boolean;
  class: boolean;
}

export interface CharacterConfiguration {
  playerCount: number;
  pointPool: number;
  pointCapPerAbility: number;
  startingEquipment: SettingLevel;
  startingWealth: SettingLevel;
  deathRecovery: DeathRecoveryId;
  injurySystem: boolean;
  permanentWounds: boolean;
  equipmentRules: boolean;
  equipmentValidationRules: EquipmentValidationRules;
  weightSystem: boolean;
  ammunitionTracking: boolean;
  moralityTracking: boolean;
  sanitySystem: boolean;
}

export interface CharacterConfigurationInput {
  playerCount: string;
  pointPool: string;
  pointCapPerAbility: string;
  startingEquipment: SettingLevel | "";
  startingWealth: SettingLevel | "";
  deathRecovery: DeathRecoveryId | "";
  injurySystem: boolean;
  permanentWounds: boolean;
  equipmentRules: boolean;
  equipmentValidationRules: EquipmentValidationRules;
  weightSystem: boolean;
  ammunitionTracking: boolean;
  moralityTracking: boolean;
  sanitySystem: boolean;
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export const DEATH_RECOVERY_OPTIONS: { id: DeathRecoveryId; label: string }[] = [
  { id: "out-of-scene", label: "Out of scene" },
  { id: "dead", label: "Dead" },
];

export const EQUIPMENT_VALIDATION_RULES: { id: EquipmentValidationRuleId; label: string }[] = [
  { id: "level", label: "Level" },
  { id: "stats", label: "Stats" },
  { id: "race", label: "Race" },
  { id: "class", label: "Class" },
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export function emptyCharacterConfigurationInput(): CharacterConfigurationInput {
  return {
    playerCount: "",
    pointPool: "",
    pointCapPerAbility: "",
    startingEquipment: "",
    startingWealth: "",
    deathRecovery: "",
    injurySystem: false,
    permanentWounds: false,
    equipmentRules: false,
    equipmentValidationRules: { level: false, stats: false, race: false, class: false },
    weightSystem: false,
    ammunitionTracking: false,
    moralityTracking: false,
    sanitySystem: false,
  };
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
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { ok: false, error: invalid.replace("{field}", field) };
  }
  return { ok: true, value: parsed };
}

export function validateCharacterConfiguration(
  input: CharacterConfigurationInput,
): Check<CharacterConfiguration> {
  const playerCount = readPositiveInt(
    input.playerCount,
    "Enter the number of players.",
    "Enter a positive whole number for {field}.",
    "number of players",
  );
  if (!playerCount.ok) return playerCount;
  if (playerCount.value < MIN_PLAYERS || playerCount.value > MAX_PLAYERS) {
    return {
      ok: false,
      error: `Number of players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}, including you.`,
    };
  }

  const pointPool = readPositiveInt(
    input.pointPool,
    "Enter a point pool.",
    "Enter a positive whole number for {field}.",
    "point pool",
  );
  if (!pointPool.ok) return pointPool;
  if (pointPool.value > 12) {
    return { ok: false, error: "Point pool must be 12 or fewer." };
  }

  const pointCapPerAbility = readPositiveInt(
    input.pointCapPerAbility,
    "Enter a point cap per ability.",
    "Enter a positive whole number for {field}.",
    "point cap per ability",
  );
  if (!pointCapPerAbility.ok) return pointCapPerAbility;
  if (pointCapPerAbility.value > pointPool.value) {
    return { ok: false, error: "Point cap per ability cannot exceed the point pool." };
  }

  const startingEquipment = readChoice(
    input.startingEquipment,
    SETTING_LEVELS,
    "Choose starting equipment.",
  );
  if (!startingEquipment.ok) return startingEquipment;

  const startingWealth = readChoice(input.startingWealth, SETTING_LEVELS, "Choose starting wealth.");
  if (!startingWealth.ok) return startingWealth;

  const deathRecovery = readChoice(
    input.deathRecovery,
    DEATH_RECOVERY_OPTIONS,
    "Choose death and recovery.",
  );
  if (!deathRecovery.ok) return deathRecovery;

  const rules = input.equipmentValidationRules;
  if (input.equipmentRules) {
    const anyRule = rules.level || rules.stats || rules.race || rules.class;
    if (!anyRule) {
      return { ok: false, error: "Choose at least one equipment validation rule." };
    }
  }

  return {
    ok: true,
    value: {
      playerCount: playerCount.value,
      pointPool: pointPool.value,
      pointCapPerAbility: pointCapPerAbility.value,
      startingEquipment: startingEquipment.value,
      startingWealth: startingWealth.value,
      deathRecovery: deathRecovery.value,
      injurySystem: input.injurySystem,
      permanentWounds: input.permanentWounds,
      equipmentRules: input.equipmentRules,
      equipmentValidationRules: { ...rules },
      weightSystem: input.weightSystem,
      ammunitionTracking: input.ammunitionTracking,
      moralityTracking: input.moralityTracking,
      sanitySystem: input.sanitySystem,
    },
  };
}

export function legacyDeathPenaltyFromRecovery(recovery: DeathRecoveryId): DeathPenaltyId {
  if (recovery === "dead") return "new-character";
  return "out-of-scene";
}

export function deathRecoveryFromLegacy(penalty: DeathPenaltyId): DeathRecoveryId {
  if (penalty === "new-character") return "dead";
  return "out-of-scene";
}
