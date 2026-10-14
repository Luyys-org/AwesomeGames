import {
  characterAbilityCopy,
  characterPortraitPath,
} from "@/leaders/lib/character-metadata";
import { formatPieceTypeName } from "@/leaders/lib/piece-display";
import type { PieceType } from "@/leaders/services/game.types";

export interface LandingRosterEntry {
  key: string;
  name: string;
  imageSrc: string;
  description: string;
}

const ROSTER_PIECE_TYPES: readonly PieceType[] = [
  "LEADER",
  "SHAMAN",
  "SNIPER",
  "TACTICIAN",
  "WILL_O_THE_WISP",
  "ACROBAT",
  "RIDER",
  "BRUISER",
  "ROYAL_GUARD",
  "ILLUSIONIST",
  "CLAW_LAUNCHER",
  "MANIPULATOR",
  "WANDERER",
  "BREWMASTER",
  "ARCHER",
  "ASSASSIN",
  "JAILOR",
  "PROTECTOR",
  "VIZIER",
  "NEMESIS",
  "HERMIT",
  "CUB",
];

function buildLandingRoster(): LandingRosterEntry[] {
  const entries: LandingRosterEntry[] = ROSTER_PIECE_TYPES.map((type) => ({
    key: type,
    name: formatPieceTypeName(type),
    imageSrc: characterPortraitPath(type),
    description: characterAbilityCopy(type).summary,
  }));

  entries.push({
    key: "frog",
    name: "Frog",
    imageSrc: characterPortraitPath("SHAMAN", { frog: true }),
    description:
      "Shaman transformation: move up to 2 spaces; may pass through occupied cells; never helps capture.",
  });

  return entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/** 23 roster entries (22 piece types + Frog), sorted by display name. */
export const LANDING_ROSTER: readonly LandingRosterEntry[] = buildLandingRoster();
