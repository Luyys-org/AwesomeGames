import type { PieceType } from "@/leaders/services/game.types";

const PIECE_IMAGE_SLUG = {
  LEADER: "leader",
  SHAMAN: "shaman",
  SNIPER: "sniper",
  TACTICIAN: "tactician",
  WILL_O_THE_WISP: "will-o-the-wisp",
  ACROBAT: "acrobat",
  RIDER: "rider",
  BRUISER: "bruiser",
  ROYAL_GUARD: "royal_guard",
  ILLUSIONIST: "illusionist",
  CLAW_LAUNCHER: "claw_launcher",
  MANIPULATOR: "manipulator",
  WANDERER: "wanderer",
  BREWMASTER: "brew_master",
  ARCHER: "archer",
  ASSASSIN: "assassin",
  JAILOR: "jailor",
  PROTECTOR: "protector",
  VIZIER: "vizier",
  NEMESIS: "nemesis",
  HERMIT: "hermit",
  CUB: "cub",
} as const satisfies Record<PieceType, string>;

export function characterImageFileSlug(type: PieceType): string {
  return PIECE_IMAGE_SLUG[type];
}

export function characterPortraitPath(
  type: PieceType,
  options?: { frog?: boolean },
): string {
  if (options?.frog) {
    return "/leaders/characters/frog.png";
  }

  return `/leaders/characters/${characterImageFileSlug(type)}.png`;
}

export interface CharacterAbilityCopy {
  summary: string;
  rules: readonly string[];
}

const PIECE_ABILITY_COPY = {
  LEADER: {
    summary: "Default move only.",
    rules: ["No special ability.", "VIZIER may add one empty step to Leader movement."],
  },
  SHAMAN: {
    summary: "Active: A visible non-Leader on a straight line becomes FROG.",
    rules: [
      "FROG lasts until after the opponent's next full turn (Action + Recruitment).",
      "FROG: move up to 2 spaces; may pass through occupied cells.",
      "FROG never helps capture.",
      "If the piece already acted this Action Phase, it cannot act again as Frog.",
    ],
  },
  SNIPER: {
    summary: "Passive: At turn start, win if enemy Leader is 3+ away on a straight line.",
    rules: ["Checked before Action Phase.", "Instant win when true."],
  },
  TACTICIAN: {
    summary:
      "Active: If an ally is adjacent to the enemy Leader, move a non-Leader ally 1 space.",
    rules: ["That ally cannot use its active ability this turn."],
  },
  WILL_O_THE_WISP: {
    summary: "Special: Move to any empty cell.",
    rules: ["Never helps capture."],
  },
  ACROBAT: {
    summary: "Active: Jump in a straight line over one adjacent character to an empty cell.",
    rules: [
      "May jump twice in one action.",
      "Second jump may use a different straight direction.",
      "Still one adjacent character jumped per jump.",
    ],
  },
  RIDER: {
    summary: "Active: Move 2 spaces in one straight line.",
    rules: ["Intermediate cells (if any) and destination must be empty."],
  },
  BRUISER: {
    summary: "Active: Enter an adjacent enemy's cell; the enemy is pushed away.",
    rules: [
      "You choose which of the three opposite hexes the enemy occupies.",
      "Destination must be empty and on the board.",
    ],
  },
  ROYAL_GUARD: {
    summary: "Active: Move to an empty cell adjacent to your Leader.",
    rules: [
      "Select the Royal Guard, tap your Leader, then tap a highlighted empty cell next to the Leader.",
      "Then optionally move 1 more space to another empty cell.",
    ],
  },
  ILLUSIONIST: {
    summary: "Active: Swap with a non-adjacent, visible character on a straight line.",
    rules: [],
  },
  CLAW_LAUNCHER: {
    summary: "Active: Advance toward or Drag a visible character on a clear straight line.",
    rules: [
      "Advance: move to the empty cell adjacent to them on that line.",
      "Drag: pull them along the line until adjacent to you; you do not move.",
      "No characters may lie between the endpoints used by the motion.",
    ],
  },
  MANIPULATOR: {
    summary:
      "Active: A visible non-adjacent enemy on a straight line moves 1 space along that line.",
    rules: [
      "You choose toward or away from the Manipulator.",
      "Destination must be empty and on the board.",
    ],
  },
  WANDERER: {
    summary: "Active: Move to any empty cell not adjacent to any enemy.",
    rules: [],
  },
  BREWMASTER: {
    summary: "Active: Move an adjacent ally 1 space to an empty cell.",
    rules: [],
  },
  ARCHER: {
    summary: "Passive: Helps capture the enemy Leader from 2 spaces on a straight line.",
    rules: ["Does not help if adjacent.", "Counts as one captor; a second is still required."],
  },
  ASSASSIN: {
    summary: "Passive: Adjacent to the enemy Leader captures without a second captor.",
    rules: ["Checked at end of turn."],
  },
  JAILOR: {
    summary: "Passive: Adjacent enemies cannot use Active abilities.",
    rules: [],
  },
  PROTECTOR: {
    summary: "Passive: Enemy abilities cannot move the Protector or adjacent allies.",
    rules: [],
  },
  VIZIER: {
    summary: "Passive: Your Leader may move 1 additional empty step during its action.",
    rules: ["Leader safety rules still apply."],
  },
  NEMESIS: {
    summary: "Special: No voluntary move during your Action Phase.",
    rules: [
      "When the enemy Leader moves, Nemesis must move 2 hexes in a straight, clear line to a different empty cell.",
      "Standard occupancy rules apply on the path.",
      "Only Nemesis may break Leader safety mid-resolution.",
      "Capture and surround are checked after Nemesis's forced move.",
    ],
  },
  HERMIT: {
    summary: "Recruited with Cub; act with Hermit, Cub, or both in Action Phase.",
    rules: [
      "One recruitment pick places both figures.",
      "Requires two legal placements and fewer than 4 non-Leader cards.",
      "Cub never helps capture.",
    ],
  },
  CUB: {
    summary: "Recruited together with Hermit.",
    rules: ["Never helps capture.", "See Hermit for recruitment and action rules."],
  },
} as const satisfies Record<PieceType, CharacterAbilityCopy>;

export function characterAbilityCopy(type: PieceType): CharacterAbilityCopy {
  return PIECE_ABILITY_COPY[type];
}

/** Plain-text fallback (summary + rules). */
export function characterAbilityDescription(type: PieceType): string {
  const { summary, rules } = characterAbilityCopy(type);
  if (rules.length === 0) {
    return summary;
  }

  return [summary, ...rules].join("\n");
}
