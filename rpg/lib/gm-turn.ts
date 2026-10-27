import type { CampaignSettings } from "@/rpg/lib/campaign-settings";
import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import {
  checkAdjustments,
  equipmentAdjustments,
  readItemModifiers,
  readItemSlot,
  type CharacterOptions,
  type ItemModifier,
} from "@/rpg/lib/character-options";
import type { TableCharacter, Wound } from "@/rpg/lib/character";
import { createItemId } from "@/rpg/lib/ids";
import { emptyJourney, rememberJourney } from "@/rpg/lib/journey";
import { applyProgress, readProgress, rewardLine, type ProgressGrant } from "@/rpg/lib/progression";
import { currencyLabel } from "@/rpg/lib/starting-kit";
import {
  actionAbilityApplies,
  validateSceneActions,
} from "@/rpg/lib/scene-action";
import {
  isGmErrorEntry,
  UNREADABLE_GM_RESULT,
  type SceneAction,
  type SceneLocation,
  type TableState,
  type TranscriptEntry,
} from "@/rpg/lib/table";

export const NARRATION_MAX = 2400;
export const SETUP_MAX = 280;
export const LOCATION_MAX = 80;
export const ENCOUNTER_NAME_MAX = 48;
export const ENCOUNTER_SUMMARY_MAX = 200;
export const CARRIED_MAX = 16;

const DIFFICULTIES = [8, 10, 12, 15] as const;
const FAILURES = ["setback", "harm", "severe"] as const;
const WOUND_BOXES = ["hurt", "impaired", "down"] as const;

const PREFERRED_DIFFICULTY = {
  easy: 8,
  standard: 10,
  hard: 12,
  severe: 15,
} as const;

const CURRENCY_MAX: Record<SettingLevel, number> = {
  low: 12,
  standard: 40,
  high: 100,
};

const ITEM_MAX: Record<SettingLevel, number> = {
  low: 1,
  standard: 2,
  high: 3,
};

export type CheckDifficulty = (typeof DIFFICULTIES)[number];
export type CheckFailure = (typeof FAILURES)[number];

export interface GmIntent {
  characterId: string;
  characterName: string;
  kind: "speak" | "act";
  text: string;
  actionId?: string;
}

export interface GmEncounter {
  name: string;
  summary: string;
}

export interface GmLootItem {
  name: string;
  slot: string;
  equipped: boolean;
  modifiers: ItemModifier[];
}

export interface GmLootGrant {
  characterId: string;
  currency: number;
  items: GmLootItem[];
}

export interface GmCheckProposal {
  characterId: string;
  stat: string;
  difficulty: CheckDifficulty;
  failure: CheckFailure;
  abilityApplies: boolean;
  setup: string;
}

export interface GmBeat {
  narration: string;
  encounter: GmEncounter | null;
  place: string;
  weather: string;
  reputation: string;
  loot: GmLootGrant[];
  actions: SceneAction[];
  progress: ProgressGrant[];
}

export interface GmReaction extends GmBeat {
  check: GmCheckProposal | null;
}

export interface CheckResolution {
  characterId: string;
  characterName: string;
  stat: string;
  statLabel: string;
  difficulty: CheckDifficulty;
  failure: CheckFailure;
  success: boolean;
  line: string;
  woundsApplied: number;
  wounds: Wound[];
  deathPenalty: CampaignSettings["deathPenalty"] | null;
  inScene: boolean;
  archived: boolean;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function preferredCheckDifficulty(settings: CampaignSettings): CheckDifficulty {
  return PREFERRED_DIFFICULTY[settings.enemyDifficulty];
}

export function injuryEnabled(settings: CampaignSettings): boolean {
  if (!settings.characterConfiguration) return true;
  return settings.characterConfiguration.injurySystem;
}

export function gmLootLimits(settings: CampaignSettings): { currencyMax: number; itemMax: number } {
  const config = settings.campaignConfiguration;
  const fallback: SettingLevel =
    settings.lootRarity === "scarce" ? "low" : settings.lootRarity === "abundant" ? "high" : "standard";
  const currency = config?.currencyAbundance ?? fallback;
  const items = config?.lootQuantity ?? fallback;
  return { currencyMax: CURRENCY_MAX[currency], itemMax: ITEM_MAX[items] };
}

export function readGmReaction(
  value: unknown,
  table: TableState,
  intent: GmIntent,
): Parsed<GmReaction> {
  const actorId = intent.characterId;
  if (!isRecord(value)) return { ok: false, error: "Response JSON must be an object." };
  const check = readCheck(value.check, table, actorId);
  if (!check.ok) return check;
  const beat = readBeat(value, table, check.value === null);
  if (!beat.ok) return beat;
  if (check.value && beat.value.loot.length > 0) {
    return { ok: false, error: "Leave loot empty when you call a check." };
  }
  if (check.value && beat.value.progress.length > 0) {
    return { ok: false, error: "Leave progress empty when you call a check." };
  }
  if (intent.kind === "act" && intent.actionId && check.value) {
    const matched = matchChosenActionCheck(table, intent, check.value);
    if (!matched.ok) return matched;
  }

  if (check.value && statesCheckResult(`${beat.value.narration}\n${check.value.setup}`)) {
    return { ok: false, error: "Narration and setup must stop before the result." };
  }

  const narration = narrationWithEncounter(beat.value.narration || check.value?.setup || "", beat.value.encounter);
  if (!narration) return { ok: false, error: "Narration must not be empty." };

  return {
    ok: true,
    value: {
      ...beat.value,
      narration,
      loot: check.value ? [] : beat.value.loot,
      actions: check.value ? [] : beat.value.actions,
      check: check.value,
    },
  };
}

export function readGmOutcome(value: unknown, table: TableState): Parsed<GmBeat> {
  const beat = readBeat(value, table, true);
  if (!beat.ok) return beat;
  const narration = narrationWithEncounter(beat.value.narration, beat.value.encounter);
  if (!narration) return { ok: false, error: "Narration must not be empty." };
  return { ok: true, value: { ...beat.value, narration } };
}

export function applyResolvedBeat(
  table: TableState,
  beat: GmBeat,
  gmBusy: boolean,
): { ok: true; table: TableState } | { ok: false; error: string } {
  const granted = grantLoot(table.characters, beat.loot);
  if (!granted.ok) return granted;
  const progressed = applyProgress(granted.characters, beat.progress, table.settings);
  const narration = truncate(beat.narration, NARRATION_MAX);
  if (!narration) return { ok: false, error: "Narration must not be empty." };
  const rewards = rewardEntries(
    progressed.characters,
    beat.loot,
    progressed.gains,
    currencyLabel(table.settings.universe),
  );

  return {
    ok: true,
    table: {
      ...table,
      revision: table.revision + 1,
      gmBusy,
      characters: progressed.characters,
      location: nextLocation(table.location, beat),
      availableActions: beat.actions.length > 0 ? beat.actions : table.availableActions,
      journey: noteJourney(
        table,
        beat,
        rewards.flatMap((entry) => (entry.type === "reward" ? [entry.text] : [])),
      ),
      transcript: [...table.transcript, { type: "narration", text: narration }, ...rewards],
    },
  };
}

export function commitCheckBeat(
  table: TableState,
  beat: GmBeat,
  check: GmCheckProposal,
  gmBusy: boolean,
): { ok: true; table: TableState; resolution: CheckResolution } | { ok: false; error: string } {
  const character = table.characters.find((entry) => entry.id === check.characterId);
  if (!character || character.archived || !character.inScene || character.wounds.includes("down")) {
    return { ok: false, error: "The acting character cannot be checked." };
  }

  const rolled = rollCheck(table.settings.characterOptions, character, check);
  const injured = applyWoundCount(
    character,
    rolled.woundCount,
    table.settings.deathPenalty,
    injuryEnabled(table.settings),
  );
  const narration = truncate(beat.narration || check.setup, NARRATION_MAX);
  if (!narration) return { ok: false, error: "Narration must not be empty." };

  const transcript: TranscriptEntry[] = [
    ...table.transcript,
    { type: "narration", text: narration },
    { type: "check", characterId: character.id, line: rolled.line },
  ];
  if (injured.woundsApplied > 0) {
    transcript.push({ type: "wound", characterId: character.id, wounds: injured.character.wounds });
  }
  if (injured.death) {
    transcript.push({ type: "death", characterId: character.id, penalty: injured.death });
  }

  const resolution: CheckResolution = {
    characterId: character.id,
    characterName: character.name,
    stat: check.stat,
    statLabel: rolled.statLabel,
    difficulty: check.difficulty,
    failure: check.failure,
    success: rolled.success,
    line: rolled.line,
    woundsApplied: injured.woundsApplied,
    wounds: injured.character.wounds,
    deathPenalty: injured.death,
    inScene: injured.character.inScene,
    archived: injured.character.archived,
  };

  return {
    ok: true,
    resolution,
    table: {
      ...table,
      revision: table.revision + 1,
      gmBusy,
      location: nextLocation(table.location, beat),
      characters: table.characters.map((entry) => (entry.id === character.id ? injured.character : entry)),
      journey: noteJourney(table, beat, checkNotes(character.name, rolled.line, injured.death)),
      transcript,
    },
  };
}

export function markGmUnreadable(table: TableState, gmBusy: boolean, content: string): TableState {
  const text = content.length > 0 ? content : UNREADABLE_GM_RESULT;
  return {
    ...table,
    revision: table.revision + 1,
    gmBusy,
    transcript: [
      ...markUnresolvedIntent(table.transcript),
      { type: "gm-error", text },
    ],
  };
}

export function removeGmError(table: TableState, index: number): TableState | null {
  const entry = table.transcript[index];
  if (!entry || !isGmErrorEntry(entry)) return null;
  const transcript = table.transcript.filter((_, entryIndex) => entryIndex !== index);
  return {
    ...table,
    revision: table.revision + 1,
    transcript: markUnresolvedIntentBefore(transcript, index - 1),
  };
}

function markUnresolvedIntent(transcript: TranscriptEntry[]): TranscriptEntry[] {
  return markUnresolvedIntentBefore(transcript, transcript.length - 1);
}

function markUnresolvedIntentBefore(transcript: TranscriptEntry[], start: number): TranscriptEntry[] {
  for (let index = start; index >= 0; index -= 1) {
    const entry = transcript[index];
    if (!entry) continue;
    if (isResolvedBeatEntry(entry)) return transcript;
    if (entry.type === "system" || entry.type === "gm-error") continue;
    if (entry.type !== "intent" || (entry.kind !== "speak" && entry.kind !== "act")) return transcript;
    if (entry.failed) return transcript;
    const next = transcript.slice();
    next[index] = { ...entry, failed: true };
    return next;
  }
  return transcript;
}

function isResolvedBeatEntry(entry: TranscriptEntry): boolean {
  return (
    entry.type === "narration" ||
    entry.type === "check" ||
    entry.type === "wound" ||
    entry.type === "death" ||
    entry.type === "situation"
  );
}

function readBeat(value: unknown, table: TableState, actionsRequired: boolean): Parsed<GmBeat> {
  if (!isRecord(value)) return { ok: false, error: "Response JSON must be an object." };

  const narration = readNarration(value.narration);
  if (!narration.ok) return narration;
  const encounter = readEncounter(value.encounter);
  if (!encounter.ok) return encounter;
  const place = readLine(value.place, "Place");
  if (!place.ok) return place;
  const weather = readLine(value.weather, "Weather");
  if (!weather.ok) return weather;
  const reputation = readLine(value.reputation, "Reputation");
  if (!reputation.ok) return reputation;
  const loot = readLoot(value.loot, table);
  if (!loot.ok) return loot;
  const actions = readActions(value.actions, table, actionsRequired);
  if (!actions.ok) return actions;
  const progress = readProgress(value.progress, table.characters);
  if (!progress.ok) return progress;

  return {
    ok: true,
    value: {
      narration: narration.value,
      encounter: encounter.value,
      place: place.value,
      weather: weather.value,
      reputation: reputation.value,
      loot: loot.value,
      actions: actions.value,
      progress: progress.value,
    },
  };
}

function readNarration(value: unknown): Parsed<string> {
  if (value === undefined || value === null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "Narration must be a string." };
  return { ok: true, value: truncate(value, NARRATION_MAX) };
}

function readEncounter(value: unknown): Parsed<GmEncounter | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.summary !== "string") {
    return { ok: false, error: "Encounter must be null or an object with name and summary." };
  }
  const name = truncate(value.name, ENCOUNTER_NAME_MAX);
  const summary = truncate(value.summary, ENCOUNTER_SUMMARY_MAX);
  if (!name || !summary) return { ok: false, error: "Encounter name and summary must not be empty." };
  return { ok: true, value: { name, summary } };
}

function readLine(value: unknown, label: string): Parsed<string> {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string.` };
  return { ok: true, value: truncate(value, LOCATION_MAX) };
}

function readLoot(value: unknown, table: TableState): Parsed<GmLootGrant[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Loot must be an array." };

  const limits = gmLootLimits(table.settings);
  const grants: GmLootGrant[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const grant = readGrant(entry, table, limits);
    if (!grant.ok) return grant;
    if (seen.has(grant.value.characterId)) {
      return { ok: false, error: "Each character can appear in loot only once." };
    }
    seen.add(grant.value.characterId);
    if (grant.value.currency === 0 && grant.value.items.length === 0) {
      return { ok: false, error: "Each loot entry must grant currency or an item." };
    }
    grants.push(grant.value);
  }
  return { ok: true, value: grants };
}

function readGrant(
  value: unknown,
  table: TableState,
  limits: { currencyMax: number; itemMax: number },
): Parsed<GmLootGrant> {
  if (!isRecord(value) || typeof value.characterId !== "string") {
    return { ok: false, error: "Each loot entry needs characterId, currency, and items." };
  }
  const character = table.characters.find((entry) => entry.id === value.characterId);
  if (!character || character.archived || !character.inScene) {
    return { ok: false, error: "Loot can go only to a living character in the scene." };
  }
  if (typeof value.currency !== "number" || !Number.isInteger(value.currency)) {
    return { ok: false, error: `Currency for ${character.name} must be a whole number.` };
  }
  if (value.currency < 0 || value.currency > limits.currencyMax) {
    return {
      ok: false,
      error: `Currency for ${character.name} must be from 0 to ${limits.currencyMax}.`,
    };
  }
  if (!Array.isArray(value.items)) return { ok: false, error: `Items for ${character.name} must be an array.` };
  if (value.items.length > limits.itemMax) {
    return { ok: false, error: `${character.name} can receive at most ${limits.itemMax} items.` };
  }
  if (character.inventory.length + value.items.length > CARRIED_MAX) {
    return { ok: false, error: `${character.name} cannot carry more items.` };
  }

  const items: GmLootItem[] = [];
  for (const item of value.items) {
    if (!isRecord(item) || typeof item.name !== "string") {
      return { ok: false, error: `Each item for ${character.name} needs a name.` };
    }
    const name = item.name.trim();
    if (name.length === 0 || name.length > 80) {
      return { ok: false, error: `Each item name for ${character.name} must be 1 to 80 characters.` };
    }
    if (item.equipped !== undefined && typeof item.equipped !== "boolean") {
      return { ok: false, error: `Equipped for ${character.name} must be true or false.` };
    }
    const modifiers = readItemModifiers(item.modifiers, table.settings.characterOptions.stats);
    if (!modifiers.ok) return modifiers;
    const slot = readItemSlot(item.slot);
    if (!slot.ok) return slot;
    items.push({ name, slot: slot.value, equipped: item.equipped === true, modifiers: modifiers.value });
  }

  return {
    ok: true,
    value: { characterId: character.id, currency: value.currency, items },
  };
}

function readActions(value: unknown, table: TableState, required: boolean): Parsed<SceneAction[]> {
  if (!required) return { ok: true, value: [] };
  const actions = validateSceneActions(value, table);
  if (!actions.ok) return actions;
  if (actions.value.length < 3 || actions.value.length > 8) {
    return { ok: false, error: "Return 3 to 8 actions." };
  }
  return actions;
}

function matchChosenActionCheck(
  table: TableState,
  intent: GmIntent,
  check: GmCheckProposal,
): Parsed<null> {
  const action = table.availableActions.find((entry) => entry.id === intent.actionId);
  if (!action) return { ok: true, value: null };
  if (check.stat !== action.stat) {
    return { ok: false, error: "Check stat must match the chosen action." };
  }
  if (check.difficulty !== action.difficulty) {
    return { ok: false, error: "Check difficulty must match the chosen action." };
  }
  if (check.failure !== action.failure) {
    return { ok: false, error: "Check failure must match the chosen action." };
  }
  const character = table.characters.find((entry) => entry.id === intent.characterId);
  if (!character) return { ok: false, error: "The acting character cannot be checked." };
  const expectedAbility = actionAbilityApplies(character, table.settings.characterOptions, action);
  if (check.abilityApplies !== expectedAbility) {
    return { ok: false, error: "abilityApplies must match the chosen action and acting character." };
  }
  return { ok: true, value: null };
}

const OUTCOME_WORD = /\b(success|failure|succeeds|succeeded|fails|failed|d20)\b/i;
const DIE_RESULT = /\bnatural\s+\d{1,2}\b|\brolled\s+(?:a\s+)?\d{1,2}\b/i;
const WOUND_MARK =
  /\bwound box\b|\bmarks?\s+(?:a\s+)?wound\b|\btakes?\s+(?:a\s+)?wound\b|\b(?:is|becomes|now)\s+(?:hurt|impaired|down)\b/i;

function statesCheckResult(text: string): boolean {
  return OUTCOME_WORD.test(text) || DIE_RESULT.test(text) || WOUND_MARK.test(text);
}

function checkNotes(name: string, line: string, death: CampaignSettings["deathPenalty"] | null): string[] {
  const notes = [`${name}: ${line}`];
  if (death) notes.push(`${name}: ${death}.`);
  return notes;
}

function noteJourney(
  table: TableState,
  beat: Pick<GmBeat, "place" | "encounter">,
  events: string[],
) {
  return rememberJourney(table.journey ?? emptyJourney(), {
    scene: table.scene,
    place: beat.place || table.location.place,
    encounter: beat.encounter,
    events,
  });
}

function narrationWithEncounter(narration: string, encounter: GmEncounter | null): string {
  if (!encounter) return narration;
  if (narration.toLowerCase().includes(encounter.name.toLowerCase())) return narration;
  const extra = `${encounter.name}. ${encounter.summary}`;
  return truncate(narration ? `${narration} ${extra}` : extra, NARRATION_MAX);
}

function readCheck(value: unknown, table: TableState, actorId: string): Parsed<GmCheckProposal | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!isRecord(value)) return { ok: false, error: "Check must be null or a check object." };
  if (value.characterId !== actorId) return { ok: false, error: "The check must use the acting character." };

  const character = table.characters.find((entry) => entry.id === actorId);
  if (!character || character.archived || !character.inScene || character.wounds.includes("down")) {
    return { ok: false, error: "The acting character cannot be checked." };
  }

  const options = table.settings.characterOptions;
  if (typeof value.stat !== "string" || !options.stats.some((stat) => stat.id === value.stat)) {
    return { ok: false, error: "Check stat must be one of the campaign stats." };
  }
  if (!isDifficulty(value.difficulty)) return { ok: false, error: "Check difficulty must be 8, 10, 12, or 15." };
  if (!isFailure(value.failure)) return { ok: false, error: "Check failure must be setback, harm, or severe." };
  if (typeof value.abilityApplies !== "boolean") {
    return { ok: false, error: "abilityApplies must be true or false." };
  }
  if (value.abilityApplies && !skillMatches(character, options, value.stat)) {
    return {
      ok: false,
      error: "abilityApplies can be true only when one of the character's skills uses that stat.",
    };
  }
  if (typeof value.setup !== "string" || truncate(value.setup, SETUP_MAX).length === 0) {
    return { ok: false, error: "Check setup must not be empty." };
  }

  return {
    ok: true,
    value: {
      characterId: actorId,
      stat: value.stat,
      difficulty: value.difficulty,
      failure: value.failure,
      abilityApplies: value.abilityApplies,
      setup: truncate(value.setup, SETUP_MAX),
    },
  };
}

function rollCheck(
  options: CharacterOptions,
  character: TableCharacter,
  check: GmCheckProposal,
): { line: string; success: boolean; woundCount: number; statLabel: string } {
  const natural = rollD20();
  const assigned = character.stats[check.stat] ?? 0;
  const adjustments = checkAdjustments(
    options,
    character.classId,
    character.raceId,
    check.stat,
    character.raceStatIds,
  );
  const gear = equipmentAdjustments(character.inventory, check.stat);
  const ability = check.abilityApplies ? 2 : 0;
  const impaired = character.wounds.includes("impaired") ? 2 : 0;
  const total =
    natural + assigned + adjustments.stat + gear.stat + adjustments.roll + gear.roll + ability - impaired;
  const success = natural === 20 || (natural !== 1 && total >= check.difficulty);
  const statLabel = options.stats.find((stat) => stat.id === check.stat)?.label ?? check.stat;
  const parts = [`d20 ${natural}`];
  if (assigned !== 0) parts.push(`${signed(assigned)} stat`);
  const modifierStat = adjustments.stat + gear.stat;
  const modifierRoll = adjustments.roll + gear.roll;
  if (modifierStat !== 0) parts.push(`${signed(modifierStat)} modifier`);
  if (modifierRoll !== 0) parts.push(`${signed(modifierRoll)} roll`);
  if (ability !== 0) parts.push(`${signed(ability)} ${abilityLabel(character, options, check.stat)}`);
  if (impaired !== 0) parts.push("−2 impaired");

  return {
    statLabel,
    success,
    woundCount: woundCount(check, success, natural, total),
    line: `${statLabel} ${total} vs ${check.difficulty} — ${success ? "success" : "failure"} (${parts.join(", ")})`,
  };
}

function woundCount(check: GmCheckProposal, success: boolean, natural: number, total: number): number {
  if (success || check.failure === "setback") return 0;
  if (check.failure === "harm") return 1;
  const margin = natural === 1 ? Math.max(check.difficulty - total, 5) : check.difficulty - total;
  return margin >= 5 ? 2 : 1;
}

function applyWoundCount(
  character: TableCharacter,
  count: number,
  penalty: CampaignSettings["deathPenalty"],
  injury: boolean,
): { character: TableCharacter; woundsApplied: number; death: CampaignSettings["deathPenalty"] | null } {
  if (!injury || count <= 0 || character.wounds.includes("down")) {
    return { character, woundsApplied: 0, death: null };
  }

  const wounds: Wound[] = [...character.wounds];
  let applied = 0;
  let death: CampaignSettings["deathPenalty"] | null = null;
  for (let index = 0; index < count; index += 1) {
    if (wounds.includes("down")) break;
    const next = WOUND_BOXES[wounds.length];
    if (!next) break;
    wounds.push(next);
    applied += 1;
    if (next === "down") {
      death = penalty;
      break;
    }
  }

  let nextCharacter: TableCharacter = { ...character, wounds };
  if (death === "out-of-scene") nextCharacter = { ...nextCharacter, inScene: false };
  if (death === "new-character") nextCharacter = { ...nextCharacter, archived: true, inScene: false };
  return { character: nextCharacter, woundsApplied: applied, death };
}

function grantLoot(
  characters: TableCharacter[],
  loot: GmLootGrant[],
): { ok: true; characters: TableCharacter[] } | { ok: false; error: string } {
  if (loot.length === 0) return { ok: true, characters };
  const byId = new Map(loot.map((grant) => [grant.characterId, grant]));
  const next: TableCharacter[] = [];
  for (const character of characters) {
    const grant = byId.get(character.id);
    if (!grant) {
      next.push(character);
      continue;
    }
    if (character.archived || !character.inScene) {
      return { ok: false, error: `Loot cannot be given to ${character.name}.` };
    }
    if (character.inventory.length + grant.items.length > CARRIED_MAX) {
      return { ok: false, error: `${character.name} cannot carry more items.` };
    }
    next.push({
      ...character,
      currency: character.currency + grant.currency,
      inventory: [
        ...character.inventory,
        ...grant.items.map((item) => ({
          id: createItemId(),
          name: item.name,
          slot: item.slot,
          equipped: item.equipped,
          modifiers: item.modifiers,
        })),
      ],
    });
  }
  return { ok: true, characters: next };
}

function rewardEntries(
  characters: TableCharacter[],
  loot: GmLootGrant[],
  gains: { characterId: string; xp: number; levelsGained: number; level: number }[],
  currencyName: string,
): TranscriptEntry[] {
  const ids = [...new Set([...loot.map((grant) => grant.characterId), ...gains.map((gain) => gain.characterId)])];
  const entries: TranscriptEntry[] = [];
  for (const characterId of ids) {
    const character = characters.find((entry) => entry.id === characterId);
    const grant = loot.find((entry) => entry.characterId === characterId);
    const gain = gains.find((entry) => entry.characterId === characterId);
    const text = rewardLine({
      name: character?.name ?? "Someone",
      xp: gain?.xp,
      levelsGained: gain?.levelsGained,
      level: gain?.level,
      currency: grant?.currency,
      currencyName,
      items: grant?.items.map((item) => item.name),
    });
    if (text) entries.push({ type: "reward", characterId, text });
  }
  return entries;
}

function nextLocation(current: SceneLocation, beat: Pick<GmBeat, "place" | "weather" | "reputation">): SceneLocation {
  return {
    place: beat.place || current.place,
    weather: beat.weather || current.weather,
    reputation: beat.reputation || current.reputation,
  };
}

function skillMatches(character: TableCharacter, options: CharacterOptions, statId: string): boolean {
  return [character.abilityId, character.extraAbilityId].some((id) => {
    if (!id) return false;
    return options.skills.some((skill) => skill.id === id && skill.statId === statId);
  });
}

function abilityLabel(character: TableCharacter, options: CharacterOptions, statId: string): string {
  for (const id of [character.abilityId, character.extraAbilityId]) {
    const skill = options.skills.find((entry) => entry.id === id && entry.statId === statId);
    if (skill) return skill.label;
  }
  return "skill";
}

function rollD20(): number {
  const limit = Math.floor(2 ** 32 / 20) * 20;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);
  return (value % 20) + 1;
}

function signed(value: number): string {
  if (value < 0) return `−${Math.abs(value)}`;
  return `+${value}`;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function isDifficulty(value: unknown): value is CheckDifficulty {
  return DIFFICULTIES.some((entry) => entry === value);
}

function isFailure(value: unknown): value is CheckFailure {
  return FAILURES.some((entry) => entry === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
