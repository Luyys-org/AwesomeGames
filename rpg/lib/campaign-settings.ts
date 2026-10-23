export type UniverseId = "star-wars" | "dungeons-and-dragons" | "alien" | "custom";

export type DeathPenaltyId = "wounded" | "out-of-scene" | "new-character";

export interface CampaignSettings {
  campaignName: string;
  universe: UniverseId;
  universeLabel: string | null;
  objective: string;
  deathPenalty: DeathPenaltyId;
}

export const UNIVERSES: { id: UniverseId; label: string }[] = [
  { id: "star-wars", label: "Star Wars" },
  { id: "dungeons-and-dragons", label: "Dungeons & Dragons" },
  { id: "alien", label: "Alien" },
  { id: "custom", label: "Custom" },
];

export const DEATH_PENALTIES: { id: DeathPenaltyId; label: string }[] = [
  { id: "wounded", label: "Wounded" },
  { id: "out-of-scene", label: "Out of scene" },
  { id: "new-character", label: "New character" },
];

function hasLineBreak(value: string): boolean {
  return value.includes("\n") || value.includes("\r");
}

function isUniverse(value: string): value is UniverseId {
  return UNIVERSES.some((entry) => entry.id === value);
}

function isDeathPenalty(value: string): value is DeathPenaltyId {
  return DEATH_PENALTIES.some((entry) => entry.id === value);
}

export function validateCampaignSettings(input: {
  campaignName: string;
  universe: string;
  universeLabel: string;
  objective: string;
  deathPenalty: string;
}): { ok: true; value: CampaignSettings } | { ok: false; error: string } {
  if (hasLineBreak(input.campaignName)) {
    return { ok: false, error: "Campaign name cannot contain line breaks." };
  }

  const campaignName = input.campaignName.trim();
  if (campaignName.length === 0) {
    return { ok: false, error: "Enter a campaign name." };
  }
  if (campaignName.length > 60) {
    return { ok: false, error: "Campaign name must be 60 characters or fewer." };
  }

  if (!isUniverse(input.universe)) {
    return { ok: false, error: "Choose a universe." };
  }

  let universeLabel: string | null = null;
  if (input.universe === "custom") {
    if (hasLineBreak(input.universeLabel)) {
      return { ok: false, error: "Universe name cannot contain line breaks." };
    }
    universeLabel = input.universeLabel.trim();
    if (universeLabel.length === 0) {
      return { ok: false, error: "Enter a name for the custom universe." };
    }
    if (universeLabel.length > 40) {
      return { ok: false, error: "Universe name must be 40 characters or fewer." };
    }
  }

  if (hasLineBreak(input.objective)) {
    return { ok: false, error: "Objective cannot contain line breaks." };
  }

  const objective = input.objective.trim();
  if (objective.length === 0) {
    return { ok: false, error: "Enter an objective." };
  }
  if (objective.length > 280) {
    return { ok: false, error: "Objective must be 280 characters or fewer." };
  }

  if (!isDeathPenalty(input.deathPenalty)) {
    return { ok: false, error: "Choose a death penalty." };
  }

  return {
    ok: true,
    value: {
      campaignName,
      universe: input.universe,
      universeLabel,
      objective,
      deathPenalty: input.deathPenalty,
    },
  };
}
