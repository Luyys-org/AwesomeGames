import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import type { CharacterOptions } from "@/rpg/lib/character-options";
import type { TableCharacter } from "@/rpg/lib/character";

export const XP_PER_LEVEL = 1000;

const TIERS = ["minor", "notable", "major"] as const;

export type ProgressTier = (typeof TIERS)[number];

export interface ProgressGrant {
  characterId: string;
  tier: ProgressTier;
}

export interface ProgressGain {
  characterId: string;
  xp: number;
  levelsGained: number;
  level: number;
}

export type LevelRewardChoice =
  | { kind: "stat"; statId: string; label: string }
  | { kind: "skill"; skillId: string; label: string };

const XP_BY_MULTIPLIER: Record<SettingLevel, Record<ProgressTier, number>> = {
  low: { minor: 50, notable: 100, major: 180 },
  standard: { minor: 100, notable: 200, major: 350 },
  high: { minor: 180, notable: 350, major: 600 },
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function progressionRules(settings: CampaignSettings): {
  levelCap: number;
  milestone: number;
  multiplier: SettingLevel;
  statCeiling: number;
} {
  const config = settings.campaignConfiguration;
  const statCap = settings.characterOptions.statCap;
  const pointCap = settings.characterConfiguration?.pointCapPerAbility;
  return {
    levelCap: config?.levelCap && config.levelCap > 0 ? config.levelCap : 10,
    milestone: config?.milestoneProgression && config.milestoneProgression > 0 ? config.milestoneProgression : 1,
    multiplier: config?.experienceGainMultiplier ?? "standard",
    statCeiling: pointCap && pointCap > 0 ? Math.min(statCap, pointCap) : statCap,
  };
}

export function xpForTier(multiplier: SettingLevel, tier: ProgressTier): number {
  return XP_BY_MULTIPLIER[multiplier][tier];
}

export function readProgress(value: unknown, characters: TableCharacter[]): Parsed<ProgressGrant[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Progress must be an array." };
  const grants: ProgressGrant[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, error: "Each progress entry needs characterId and tier." };
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.characterId !== "string" || typeof record.tier !== "string") {
      return { ok: false, error: "Each progress entry needs characterId and tier." };
    }
    if (!TIERS.includes(record.tier as ProgressTier)) {
      return { ok: false, error: "Progress tier must be minor, notable, or major." };
    }
    const character = characters.find((candidate) => candidate.id === record.characterId);
    if (!character || character.archived) {
      return { ok: false, error: "Progress can go only to a living character." };
    }
    if (seen.has(character.id)) return { ok: false, error: "Each character can gain experience only once." };
    seen.add(character.id);
    grants.push({ characterId: character.id, tier: record.tier as ProgressTier });
  }
  return { ok: true, value: grants };
}

export function applyProgress(
  characters: TableCharacter[],
  grants: ProgressGrant[],
  settings: CampaignSettings,
): { characters: TableCharacter[]; gains: ProgressGain[] } {
  if (grants.length === 0) return { characters, gains: [] };
  const rules = progressionRules(settings);
  const gains: ProgressGain[] = [];
  const next = characters.map((character) => {
    const grant = grants.find((entry) => entry.characterId === character.id);
    if (!grant) return character;
    const amount = xpForTier(rules.multiplier, grant.tier);
    const applied = addExperience(character, amount, rules, settings);
    if (applied.levelsGained > 0 || applied.xpGained > 0) {
      gains.push({
        characterId: character.id,
        xp: applied.xpGained,
        levelsGained: applied.levelsGained,
        level: applied.character.level,
      });
    }
    return applied.character;
  });
  return { characters: next, gains };
}

function addExperience(
  character: TableCharacter,
  amount: number,
  rules: ReturnType<typeof progressionRules>,
  settings: CampaignSettings,
): { character: TableCharacter; xpGained: number; levelsGained: number } {
  if (amount <= 0 || character.level >= rules.levelCap) {
    return { character, xpGained: 0, levelsGained: 0 };
  }
  let xp = character.xp + amount;
  let level = character.level;
  let pending = character.pendingRewards;
  let levelsGained = 0;
  while (xp >= XP_PER_LEVEL && level < rules.levelCap) {
    xp -= XP_PER_LEVEL;
    level += 1;
    levelsGained += 1;
    const atMilestone = level % rules.milestone === 0;
    if (atMilestone && levelRewardOptions({ ...character, level }, settings).length > 0) {
      pending += 1;
    }
  }
  if (level >= rules.levelCap) xp = Math.min(xp, XP_PER_LEVEL);
  return {
    character: { ...character, xp, level, pendingRewards: pending },
    xpGained: amount,
    levelsGained,
  };
}

export function levelRewardOptions(
  character: Pick<TableCharacter, "stats" | "abilityId" | "extraAbilityId" | "level">,
  settings: CampaignSettings,
): LevelRewardChoice[] {
  const rules = progressionRules(settings);
  const options = settings.characterOptions;
  const choices: LevelRewardChoice[] = [];
  for (const stat of options.stats) {
    if ((character.stats[stat.id] ?? 0) < rules.statCeiling) {
      choices.push({ kind: "stat", statId: stat.id, label: `+1 ${stat.label}` });
    }
  }
  if (!character.extraAbilityId) {
    for (const skill of options.skills) {
      if (skill.id === character.abilityId) continue;
      choices.push({ kind: "skill", skillId: skill.id, label: `Learn ${skill.label}` });
    }
  }
  return choices;
}

export function levelRewardOptionsForView(
  character: Pick<TableCharacter, "stats" | "abilityId" | "extraAbilityId">,
  options: CharacterOptions,
  statCeiling: number,
): LevelRewardChoice[] {
  const choices: LevelRewardChoice[] = [];
  for (const stat of options.stats) {
    if ((character.stats[stat.id] ?? 0) < statCeiling) {
      choices.push({ kind: "stat", statId: stat.id, label: `+1 ${stat.label}` });
    }
  }
  if (!character.extraAbilityId) {
    for (const skill of options.skills) {
      if (skill.id === character.abilityId) continue;
      choices.push({ kind: "skill", skillId: skill.id, label: `Learn ${skill.label}` });
    }
  }
  return choices;
}

export function rewardLine(input: {
  name: string;
  xp?: number;
  levelsGained?: number;
  level?: number;
  currency?: number;
  currencyName?: string;
  items?: string[];
}): string | null {
  const parts: string[] = [];
  if (input.xp && input.xp > 0) parts.push(`${input.xp} XP`);
  if (input.levelsGained && input.levelsGained > 0 && input.level) {
    parts.push(input.levelsGained === 1 ? `level ${input.level}` : `level ${input.level}`);
  }
  if (input.currency && input.currency > 0) {
    parts.push(`${input.currency} ${input.currencyName ?? "currency"}`);
  }
  if (input.items && input.items.length > 0) parts.push(input.items.join(", "));
  if (parts.length === 0) return null;
  const gained = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  if (input.levelsGained && input.levelsGained > 0) {
    return `${input.name} gains ${gained}.`.replace(
      `level ${input.level}`,
      `reaches level ${input.level}`,
    );
  }
  return `${input.name} gains ${gained}.`;
}
