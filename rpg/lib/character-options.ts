import { readUniversePreset } from "@/rpg/lib/universe-preset-cache";

export type StatAssignment = "ranked" | "pool" | "class";

export type ModifierKind = "stat" | "roll";

export interface StatDefinition {
  id: string;
  label: string;
  covers?: string;
}

export interface SkillDefinition {
  id: string;
  label: string;
  statId: string;
  applies: string;
}

export interface TraitModifier {
  id: string;
  kind: ModifierKind;
  statId: string;
  amount: number;
}

export type ItemModifier = Pick<TraitModifier, "kind" | "statId" | "amount">;

export interface RacialAbility {
  name: string;
  description: string;
}

export interface TraitDefinition {
  id: string;
  label: string;
  modifiers: TraitModifier[];
  stats?: Record<string, number>;
  ability?: RacialAbility;
  statChoices?: number;
  statChoiceAmount?: number;
  extraSkills?: number;
}

export interface CharacterOptions {
  assignment: StatAssignment;
  statPool: number;
  statCap: number;
  stats: StatDefinition[];
  skills: SkillDefinition[];
  classes: TraitDefinition[];
  races: TraitDefinition[];
}

export interface ModifierDraft {
  id: string;
  kind: string;
  statId: string;
  amount: string;
}

export interface TraitDraft {
  id: string;
  label: string;
  modifiers: ModifierDraft[];
}

export interface CharacterOptionsDraft {
  statPool: string;
  statCap: string;
  stats: StatDefinition[];
  skills: { id: string; label: string; statId: string; applies: string }[];
  classes: TraitDraft[];
  races: TraitDraft[];
}

export interface CheckAdjustments {
  stat: number;
  roll: number;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; empty?: boolean };

const MAX_STAT_POOL = 12;
const MAX_CLASS_POOL = 60;
const MAX_STATS = 6;
const MAX_SKILLS = 12;
const MAX_TRAITS = 8;
const MAX_STORED_CLASSES = 14;
const MAX_STORED_RACES = 16;
const MAX_MODIFIERS = 4;
const MAX_STORED_MODIFIERS = 5;
const MAX_LABEL = 24;
const MAX_APPLIES = 80;
const ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

const CORE_STATS: StatDefinition[] = [
  { id: "might", label: "Might" },
  { id: "finesse", label: "Finesse" },
  { id: "wits", label: "Wits" },
];

const CORE_SKILLS: SkillDefinition[] = [
  { id: "fighter", label: "Fighter", statId: "might", applies: "fight, break, lift, or endure" },
  { id: "shooter", label: "Shooter", statId: "finesse", applies: "make a ranged attack or a precise shot" },
  { id: "sneak", label: "Sneak", statId: "finesse", applies: "hide, sneak, or steal" },
  { id: "medic", label: "Medic", statId: "wits", applies: "treat wounds or diagnose" },
  { id: "scholar", label: "Scholar", statId: "wits", applies: "recall, research, or decipher" },
  { id: "face", label: "Face", statId: "wits", applies: "persuade, deceive, or calm" },
  { id: "pilot", label: "Pilot", statId: "finesse", applies: "drive, pilot, or navigate a vehicle" },
  { id: "tech", label: "Tech", statId: "wits", applies: "use, repair, or bypass a machine" },
];


export function emptyCharacterOptionsDraft(): CharacterOptionsDraft {
  return { statPool: "", statCap: "", stats: [], skills: [], classes: [], races: [] };
}

export function characterOptionsFor(universe: string): CharacterOptions | null {
  const preset = readUniversePreset(universe);
  if (!preset) return null;
  return cloneCharacterOptions(preset.characterOptions);
}

export function coreCharacterOptions(): CharacterOptions {
  return {
    assignment: "pool",
    statPool: 10,
    statCap: 10,
    stats: CORE_STATS,
    skills: CORE_SKILLS,
    classes: [],
    races: [],
  };
}

export function cloneCharacterOptions(options: CharacterOptions): CharacterOptions {
  return structuredClone(options);
}

export function resolveCharacterOptions(
  universe: string,
  draft: CharacterOptionsDraft,
): Parsed<CharacterOptions> {
  const preset = characterOptionsFor(universe);
  if (preset) return { ok: true, value: cloneCharacterOptions(preset) };
  if (universe !== "custom") return { ok: false, error: "Choose a universe." };
  return validateCharacterOptionsDraft(draft);
}

export function withStatPool(draft: CharacterOptionsDraft, statPool: string): CharacterOptionsDraft {
  return { ...draft, statPool };
}

export function withStatCap(draft: CharacterOptionsDraft, statCap: string): CharacterOptionsDraft {
  return { ...draft, statCap };
}

export function withStat(draft: CharacterOptionsDraft, id: string): CharacterOptionsDraft {
  return { ...draft, stats: [...draft.stats, { id, label: "" }] };
}

export function withStatLabel(
  draft: CharacterOptionsDraft,
  id: string,
  label: string,
): CharacterOptionsDraft {
  return {
    ...draft,
    stats: draft.stats.map((stat) => (stat.id === id ? { ...stat, label } : stat)),
  };
}

export function withoutStat(draft: CharacterOptionsDraft, id: string): CharacterOptionsDraft {
  return {
    ...draft,
    stats: draft.stats.filter((stat) => stat.id !== id),
    skills: draft.skills.map((skill) => (skill.statId === id ? { ...skill, statId: "" } : skill)),
    classes: draft.classes.map((entry) => clearModifierStat(entry, id)),
    races: draft.races.map((entry) => clearModifierStat(entry, id)),
  };
}

export function withSkill(draft: CharacterOptionsDraft, id: string): CharacterOptionsDraft {
  return { ...draft, skills: [...draft.skills, { id, label: "", statId: "", applies: "" }] };
}

export function withSkillPatch(
  draft: CharacterOptionsDraft,
  id: string,
  patch: Partial<Pick<SkillDefinition, "label" | "statId" | "applies">>,
): CharacterOptionsDraft {
  return {
    ...draft,
    skills: draft.skills.map((skill) => (skill.id === id ? { ...skill, ...patch } : skill)),
  };
}

export function withoutSkill(draft: CharacterOptionsDraft, id: string): CharacterOptionsDraft {
  return { ...draft, skills: draft.skills.filter((skill) => skill.id !== id) };
}

export function withTrait(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  id: string,
): CharacterOptionsDraft {
  return { ...draft, [list]: [...draft[list], { id, label: "", modifiers: [] }] };
}

export function withTraitLabel(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  id: string,
  label: string,
): CharacterOptionsDraft {
  return {
    ...draft,
    [list]: draft[list].map((entry) => (entry.id === id ? { ...entry, label } : entry)),
  };
}

export function withoutTrait(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  id: string,
): CharacterOptionsDraft {
  return { ...draft, [list]: draft[list].filter((entry) => entry.id !== id) };
}

export function withModifier(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  traitId: string,
  id: string,
): CharacterOptionsDraft {
  return {
    ...draft,
    [list]: draft[list].map((entry) =>
      entry.id === traitId
        ? { ...entry, modifiers: [...entry.modifiers, { id, kind: "stat", statId: "", amount: "1" }] }
        : entry,
    ),
  };
}

export function withModifierPatch(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  traitId: string,
  modifierId: string,
  patch: Partial<Pick<ModifierDraft, "kind" | "statId" | "amount">>,
): CharacterOptionsDraft {
  return {
    ...draft,
    [list]: draft[list].map((entry) =>
      entry.id === traitId
        ? {
            ...entry,
            modifiers: entry.modifiers.map((item) =>
              item.id === modifierId ? { ...item, ...patch } : item,
            ),
          }
        : entry,
    ),
  };
}

export function withoutModifier(
  draft: CharacterOptionsDraft,
  list: "classes" | "races",
  traitId: string,
  modifierId: string,
): CharacterOptionsDraft {
  return {
    ...draft,
    [list]: draft[list].map((entry) =>
      entry.id === traitId
        ? { ...entry, modifiers: entry.modifiers.filter((item) => item.id !== modifierId) }
        : entry,
    ),
  };
}

export function statLabel(options: CharacterOptions, statId: string): string {
  return options.stats.find((stat) => stat.id === statId)?.label ?? "Stat";
}

export function formatSigned(amount: number): string {
  if (amount > 0) return `+${amount}`;
  if (amount < 0) return `−${Math.abs(amount)}`;
  return "0";
}

export function formatModifier(item: ItemModifier | TraitModifier, stats: StatDefinition[]): string {
  const amount = formatSigned(item.amount);
  const stat = stats.find((entry) => entry.id === item.statId)?.label;
  if (item.kind === "roll") {
    if (!item.statId) return `${amount} on every roll`;
    return `${amount} on ${stat ?? "stat"} rolls`;
  }
  return `${amount} ${stat ?? "stat"}`;
}

export function formatModifierList(modifiers: TraitModifier[], stats: StatDefinition[]): string {
  if (modifiers.length === 0) return "None";
  return modifiers.map((item) => formatModifier(item, stats)).join(", ");
}

export function itemModifierBonuses(modifiers: ItemModifier[], stats: StatDefinition[]): string {
  const entries = modifiers.filter((item) => item.amount > 0);
  return entries.length > 0 ? entries.map((item) => formatModifier(item, stats)).join(", ") : "None";
}

export function itemModifierMaluses(modifiers: ItemModifier[], stats: StatDefinition[]): string {
  const entries = modifiers.filter((item) => item.amount < 0);
  return entries.length > 0 ? entries.map((item) => formatModifier(item, stats)).join(", ") : "None";
}

export function readItemModifiers(value: unknown, stats: StatDefinition[]): Parsed<ItemModifier[]> {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Item modifiers must be an array." };
  const modifiers: ItemModifier[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return { ok: false, error: "Each item modifier must be an object." };
    if (entry.kind !== "stat" && entry.kind !== "roll") {
      return { ok: false, error: "Item modifier kind must be stat or roll." };
    }
    if (typeof entry.statId !== "string") {
      return { ok: false, error: "Each item modifier needs a statId." };
    }
    if (typeof entry.amount !== "number" || !Number.isInteger(entry.amount) || entry.amount === 0) {
      return { ok: false, error: "Item modifier amount must be a non-zero integer from −3 to 3." };
    }
    if (entry.amount < -3 || entry.amount > 3) {
      return { ok: false, error: "Item modifier amount must be from −3 to 3." };
    }
    if (entry.kind === "stat" && !stats.some((stat) => stat.id === entry.statId)) {
      return { ok: false, error: "Item stat modifiers must use campaign stat ids." };
    }
    if (entry.kind === "roll" && entry.statId !== "" && !stats.some((stat) => stat.id === entry.statId)) {
      return { ok: false, error: "Item roll modifiers must use campaign stat ids or an empty statId." };
    }
    if (modifiers.length >= MAX_MODIFIERS) {
      return { ok: false, error: "Each item can have at most 4 modifiers." };
    }
    modifiers.push({
      kind: entry.kind,
      statId: entry.statId,
      amount: entry.amount,
    });
  }
  return { ok: true, value: modifiers };
}

export function parseItemModifiers(value: unknown, stats: StatDefinition[]): ItemModifier[] {
  const parsed = readItemModifiers(value, stats);
  return parsed.ok ? parsed.value : [];
}

const ITEM_SLOT_PATTERN = /^[a-z][a-z0-9-]{0,23}$/;

export function readItemSlot(value: unknown): Parsed<string> {
  if (value === undefined || value === "") return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "Item slot must be a string." };
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return { ok: true, value: "" };
  if (!ITEM_SLOT_PATTERN.test(trimmed)) {
    return { ok: false, error: "Item slot must be a lowercase slug up to 24 characters." };
  }
  return { ok: true, value: trimmed };
}

export function parseItemSlot(value: unknown): string {
  const parsed = readItemSlot(value);
  return parsed.ok ? parsed.value : "";
}

export function formatItemSlotLabel(slot: string): string {
  if (slot.length === 0) return "None";
  return slot
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function equipmentAdjustments(
  inventory: { equipped: boolean; modifiers: ItemModifier[] }[],
  statId: string,
): CheckAdjustments {
  let stat = 0;
  let roll = 0;
  for (const item of inventory) {
    if (!item.equipped) continue;
    for (const modifier of item.modifiers) {
      if (modifier.kind === "stat" && modifier.statId === statId) stat += modifier.amount;
      if (modifier.kind === "roll" && (modifier.statId === "" || modifier.statId === statId)) {
        roll += modifier.amount;
      }
    }
  }
  return { stat, roll };
}

export interface CharacterStatRow {
  label: string;
  total: number;
  detail: string;
}

export function characterStatRows(
  character: {
    classId: string;
    raceId: string;
    raceStatIds?: string[];
    stats: Record<string, number>;
    inventory: { equipped: boolean; modifiers: ItemModifier[] }[];
  },
  options: CharacterOptions,
): CharacterStatRow[] {
  const chosen = character.raceStatIds ?? [];
  return options.stats.map((stat) => {
    const base = character.stats[stat.id] ?? 0;
    const traits = checkAdjustments(options, character.classId, character.raceId, stat.id, chosen);
    const gear = equipmentAdjustments(character.inventory, stat.id);
    const total = base + traits.stat + gear.stat;
    const parts = [`Base ${base}`];
    if (traits.stat !== 0) parts.push(`Class/race ${formatSigned(traits.stat)}`);
    if (gear.stat !== 0) parts.push(`Equipment ${formatSigned(gear.stat)}`);
    return {
      label: stat.label,
      total,
      detail: parts.join(" · "),
    };
  });
}

export function characterRollModifierSummary(
  character: {
    classId: string;
    raceId: string;
    inventory: { equipped: boolean; modifiers: ItemModifier[] }[];
  },
  options: CharacterOptions,
): string {
  const parts: string[] = [];
  for (const entry of [findTrait(options.classes, character.classId), findTrait(options.races, character.raceId)]) {
    if (!entry) continue;
    for (const item of entry.modifiers) {
      if (item.kind === "roll") parts.push(formatModifier(item, options.stats));
    }
  }
  for (const item of character.inventory) {
    if (!item.equipped) continue;
    for (const modifier of item.modifiers) {
      if (modifier.kind === "roll") parts.push(formatModifier(modifier, options.stats));
    }
  }
  return parts.length > 0 ? parts.join(", ") : "None";
}

export function formatTraitDetail(trait: TraitDefinition, stats: StatDefinition[]): string {
  if (trait.stats) return stats.map((stat) => `${stat.label} ${trait.stats?.[stat.id] ?? 0}`).join(", ");
  if (trait.ability || trait.statChoices || trait.extraSkills) return formatRaceDetail(trait, stats);
  return formatModifierList(trait.modifiers, stats);
}

export function formatRaceDetail(trait: TraitDefinition, stats: StatDefinition[]): string {
  const bonus = trait.statChoices
    ? `+${trait.statChoiceAmount ?? 1} to ${trait.statChoices} stats of your choice`
    : signedModifiers(trait.modifiers.filter((item) => item.amount > 0), stats);
  const malus = signedModifiers(trait.modifiers.filter((item) => item.amount < 0), stats);
  const ability = trait.ability ? `${trait.ability.name}: ${trait.ability.description}` : "";
  return [`Bonus ${bonus || "none"}`, `Malus ${malus || "none"}`, ability].filter((part) => part.length > 0).join(". ");
}

export function checkAdjustments(
  options: CharacterOptions,
  classId: string,
  raceId: string,
  statId: string,
  raceStatIds: string[] = [],
): CheckAdjustments {
  let stat = 0;
  let roll = 0;
  const traits = [findTrait(options.classes, classId), findTrait(options.races, raceId)];
  for (const entry of traits) {
    if (!entry) continue;
    for (const item of entry.modifiers) {
      if (item.kind === "stat" && item.statId === statId) stat += item.amount;
      if (item.kind === "roll" && (item.statId === "" || item.statId === statId)) roll += item.amount;
    }
  }
  const race = traits[1];
  if (race?.statChoices && race.statChoiceAmount && raceStatIds.includes(statId)) {
    stat += race.statChoiceAmount;
  }
  return { stat, roll };
}

export function characterIdentity(
  character: { name: string; classId: string; raceId: string },
  options: CharacterOptions,
): { name: string; race: string; className: string } {
  return {
    name: character.name,
    race: findTrait(options.races, character.raceId)?.label ?? "",
    className: findTrait(options.classes, character.classId)?.label ?? "",
  };
}

export function characterSummary(
  character: {
    abilityId: string;
    extraAbilityId?: string;
    classId: string;
    raceId: string;
    raceStatIds?: string[];
    stats: Record<string, number>;
  },
  options: CharacterOptions,
): string {
  const race = findTrait(options.races, character.raceId);
  const className = findTrait(options.classes, character.classId)?.label;
  const skill = options.skills.find((entry) => entry.id === character.abilityId)?.label;
  const extra = options.skills.find((entry) => entry.id === character.extraAbilityId)?.label;
  const skills = [skill, extra].filter((entry): entry is string => Boolean(entry)).join(", ");
  const ability = race?.ability ? `${race.ability.name}: ${race.ability.description}` : "";
  const identity = [race?.label, className, skills, ability].filter((entry): entry is string => Boolean(entry));
  const chosen = character.raceStatIds ?? [];
  const stats = options.stats.map((stat) => {
    const base = character.stats[stat.id] ?? 0;
    const bonus = checkAdjustments(options, character.classId, character.raceId, stat.id, chosen).stat;
    const total = formatSigned(base + bonus).replace(/^\+/, "");
    if (bonus === 0) return `${stat.label} ${total}`;
    return `${stat.label} ${total} (${formatSigned(bonus)})`;
  });
  const rolls = rollSummary(options, character.classId, character.raceId);
  return [...identity, stats.join(", "), rolls].filter((entry) => entry.length > 0).join(" · ");
}

export function validateCharacterOptionsDraft(draft: CharacterOptionsDraft): Parsed<CharacterOptions> {
  const statPool = readPool(draft.statPool);
  if (!statPool.ok) return statPool;
  const statCap = readCap(draft.statCap, statPool.value);
  if (!statCap.ok) return statCap;

  const stats = readStats(draft.stats);
  if (!stats.ok) return stats;

  const skills = readSkills(draft.skills, stats.value);
  if (!skills.ok) return skills;

  const classes = readTraits(draft.classes, stats.value, "class", "classes");
  if (!classes.ok) return classes;

  const races = readTraits(draft.races, stats.value, "race", "races");
  if (!races.ok) return races;

  return {
    ok: true,
    value: {
      assignment: "pool",
      statPool: statPool.value,
      statCap: statCap.value,
      stats: stats.value,
      skills: skills.value,
      classes: classes.value,
      races: races.value,
    },
  };
}

export function parseCharacterOptions(value: unknown): CharacterOptions | null {
  if (!isRecord(value)) return null;
  if (value.assignment !== "ranked" && value.assignment !== "pool" && value.assignment !== "class") {
    return null;
  }
  if (!isStoredPool(value.statPool, value.assignment)) return null;
  const statCap = readStoredCap(value.statCap, value.assignment, value.statPool);
  if (statCap === null) return null;
  const stats = parseNamedList(value.stats, MAX_STATS);
  const skills = parseSkills(value.skills, stats);
  const fixed = value.assignment === "class" ? { cap: statCap, pool: value.statPool } : null;
  const classes = parseTraits(value.classes, stats, MAX_STORED_CLASSES, fixed);
  const races = parseTraits(value.races, stats, MAX_STORED_RACES, null);
  if (!stats || stats.length === 0 || !skills || skills.length === 0 || !classes || !races) return null;
  if (classes.length === 0 || races.length === 0) return null;
  if (value.assignment === "ranked" && !isRankedCore(stats, value.statPool)) return null;
  return {
    assignment: value.assignment,
    statPool: value.statPool,
    statCap,
    stats,
    skills,
    classes,
    races,
  };
}

export function parseStatBlock(
  value: unknown,
  options: CharacterOptions,
  classId = "",
): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const stats: Record<string, number> = {};
  for (const stat of options.stats) {
    const raw = value[stat.id];
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > pointCap(options)) {
      return null;
    }
    stats[stat.id] = raw;
  }

  const numbers = options.stats.map((stat) => stats[stat.id] ?? 0);
  if (options.assignment === "ranked") {
    const sorted = numbers.slice().sort((left, right) => left - right);
    if (sorted.length !== 3 || sorted[0] !== 0 || sorted[1] !== 1 || sorted[2] !== 2) return null;
    return stats;
  }

  if (options.assignment === "class") {
    return matchesClassStats(options, classId, stats) ? stats : null;
  }

  const sum = numbers.reduce((total, entry) => total + entry, 0);
  if (sum > options.statPool) return null;
  return stats;
}

export function readAssignedStats(
  options: CharacterOptions,
  raw: Record<string, string>,
  classId = "",
): Parsed<Record<string, number>> {
  const stats: Record<string, number> = {};
  for (const stat of options.stats) {
    const text = raw[stat.id] ?? "";
    if (!/^\d+$/.test(text)) return { ok: false, error: `Assign ${stat.label}.` };
    const value = Number(text);
    const cap = pointCap(options);
    if (!Number.isInteger(value) || value < 0 || value > cap) {
      return { ok: false, error: `${stat.label} must be from 0 to ${cap}.` };
    }
    stats[stat.id] = value;
  }

  const numbers = options.stats.map((stat) => stats[stat.id] ?? 0);
  if (options.assignment === "ranked") {
    const sorted = numbers.slice().sort((left, right) => left - right);
    if (sorted.length !== 3 || sorted[0] !== 0 || sorted[1] !== 1 || sorted[2] !== 2) {
      return { ok: false, error: "Assign 2, 1, and 0, each once." };
    }
    return { ok: true, value: stats };
  }

  if (options.assignment === "class") {
    if (!matchesClassStats(options, classId, stats)) {
      return { ok: false, error: "Use the points from your class." };
    }
    return { ok: true, value: stats };
  }

  const sum = numbers.reduce((total, entry) => total + entry, 0);
  if (sum > options.statPool) {
    return { ok: false, error: `Use at most ${options.statPool} points.` };
  }
  return { ok: true, value: stats };
}

function rollSummary(options: CharacterOptions, classId: string, raceId: string): string {
  const traits = [findTrait(options.classes, classId), findTrait(options.races, raceId)];
  const parts: string[] = [];
  for (const entry of traits) {
    if (!entry) continue;
    for (const item of entry.modifiers) {
      if (item.kind === "roll") parts.push(formatModifier(item, options.stats));
    }
  }
  return parts.join(", ");
}

function findTrait(traits: TraitDefinition[], id: string): TraitDefinition | null {
  return traits.find((entry) => entry.id === id) ?? null;
}

function clearModifierStat(entry: TraitDraft, statId: string): TraitDraft {
  return {
    ...entry,
    modifiers: entry.modifiers.map((item) => (item.statId === statId ? { ...item, statId: "" } : item)),
  };
}

function readPool(value: string): Parsed<number> {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Set the point pool." };
  const pool = Number(trimmed);
  if (!isPool(pool)) return { ok: false, error: "Point pool must be a whole number from 1 to 12." };
  return { ok: true, value: pool };
}

function readCap(value: string, pool: number): Parsed<number> {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "Set the point cap." };
  const cap = Number(trimmed);
  if (!Number.isInteger(cap) || cap < 1 || cap > pool) {
    return { ok: false, error: `Point cap must be a whole number from 1 to ${pool}.` };
  }
  return { ok: true, value: cap };
}

function readStoredCap(value: unknown, assignment: StatAssignment, pool: number): number | null {
  if (assignment === "ranked") {
    if (value === undefined || value === 2) return 2;
    return null;
  }
  if (value === undefined) return pool;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > pool) return null;
  return value;
}

function pointCap(options: CharacterOptions): number {
  return options.assignment === "ranked" ? 2 : options.statCap;
}

function readStats(entries: StatDefinition[]): Parsed<StatDefinition[]> {
  if (entries.length === 0) return { ok: false, error: "Add a stat." };
  if (entries.length > MAX_STATS) return { ok: false, error: "Use 6 stats or fewer." };
  const stats: StatDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of entries) {
    if (!isId(entry.id) || ids.has(entry.id)) return { ok: false, error: "Those stats could not be saved." };
    const label = readLabel(entry.label);
    if (!label.ok) return { ok: false, error: label.empty ? "Enter a name for each stat." : label.error };
    const key = label.value.toLowerCase();
    if (labels.has(key)) return { ok: false, error: "Stat names must be unique." };
    ids.add(entry.id);
    labels.add(key);
    stats.push({ id: entry.id, label: label.value });
  }
  return { ok: true, value: stats };
}

function readSkills(
  entries: CharacterOptionsDraft["skills"],
  stats: StatDefinition[],
): Parsed<SkillDefinition[]> {
  if (entries.length === 0) return { ok: false, error: "Add a skill." };
  if (entries.length > MAX_SKILLS) return { ok: false, error: "Use 12 skills or fewer." };
  const skills: SkillDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of entries) {
    if (!isId(entry.id) || ids.has(entry.id)) return { ok: false, error: "Those skills could not be saved." };
    const label = readLabel(entry.label);
    if (!label.ok) return { ok: false, error: label.empty ? "Enter a name for each skill." : label.error };
    const key = label.value.toLowerCase();
    if (labels.has(key)) return { ok: false, error: "Skill names must be unique." };
    if (!stats.some((stat) => stat.id === entry.statId)) {
      return { ok: false, error: "Choose a stat for each skill." };
    }
    const applies = readApplies(entry.applies);
    if (!applies.ok) return applies;
    ids.add(entry.id);
    labels.add(key);
    skills.push({ id: entry.id, label: label.value, statId: entry.statId, applies: applies.value });
  }
  return { ok: true, value: skills };
}

function readTraits(
  entries: TraitDraft[],
  stats: StatDefinition[],
  singular: string,
  plural: string,
): Parsed<TraitDefinition[]> {
  if (entries.length === 0) return { ok: false, error: `Add a ${singular}.` };
  if (entries.length > MAX_TRAITS) return { ok: false, error: `Use 8 ${plural} or fewer.` };
  const traits: TraitDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of entries) {
    if (!isId(entry.id) || ids.has(entry.id)) {
      return { ok: false, error: `Those ${plural} could not be saved.` };
    }
    const label = readLabel(entry.label);
    if (!label.ok) {
      return { ok: false, error: label.empty ? `Enter a name for each ${singular}.` : label.error };
    }
    const key = label.value.toLowerCase();
    if (labels.has(key)) return { ok: false, error: `${capitalize(singular)} names must be unique.` };
    if (entry.modifiers.length > MAX_MODIFIERS) {
      return { ok: false, error: `Each ${singular} can have at most 4 bonuses.` };
    }
    const modifiers = readModifiers(entry.modifiers, stats);
    if (!modifiers.ok) return modifiers;
    ids.add(entry.id);
    labels.add(key);
    traits.push({ id: entry.id, label: label.value, modifiers: modifiers.value });
  }
  return { ok: true, value: traits };
}

function readModifiers(entries: ModifierDraft[], stats: StatDefinition[]): Parsed<TraitModifier[]> {
  const modifiers: TraitModifier[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!isId(entry.id) || ids.has(entry.id)) return { ok: false, error: "Those bonuses could not be saved." };
    if (entry.kind !== "stat" && entry.kind !== "roll") {
      return { ok: false, error: "Choose whether a bonus changes a stat or a roll." };
    }
    const amount = readAmount(entry.amount);
    if (!amount.ok) return amount;
    if (entry.kind === "stat" && !stats.some((stat) => stat.id === entry.statId)) {
      return { ok: false, error: "Choose a stat for each stat bonus." };
    }
    if (entry.kind === "roll" && entry.statId !== "" && !stats.some((stat) => stat.id === entry.statId)) {
      return { ok: false, error: "Choose a stat for each roll bonus." };
    }
    ids.add(entry.id);
    modifiers.push({ id: entry.id, kind: entry.kind, statId: entry.statId, amount: amount.value });
  }
  return { ok: true, value: modifiers };
}

function readAmount(value: string): Parsed<number> {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: "Set each bonus to +1, +2, +3, −1, −2, or −3." };
  }
  const amount = Number(trimmed);
  if (!Number.isInteger(amount) || amount === 0 || amount < -3 || amount > 3) {
    return { ok: false, error: "Set each bonus to +1, +2, +3, −1, −2, or −3." };
  }
  return { ok: true, value: amount };
}

function readLabel(value: string): Parsed<string> {
  if (value.includes("\n") || value.includes("\r")) {
    return { ok: false, error: "Names cannot contain line breaks." };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, error: "Enter a name.", empty: true };
  if (trimmed.length > MAX_LABEL) return { ok: false, error: "Names must be 24 characters or fewer." };
  return { ok: true, value: trimmed };
}

function readApplies(value: string): Parsed<string> {
  if (value.includes("\n") || value.includes("\r")) {
    return { ok: false, error: "Skill descriptions cannot contain line breaks." };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, error: "Describe when each skill applies." };
  if (trimmed.length > MAX_APPLIES) {
    return { ok: false, error: "Skill descriptions must be 80 characters or fewer." };
  }
  return { ok: true, value: trimmed };
}

function parseNamedList(value: unknown, max: number): StatDefinition[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  const stats: StatDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.label !== "string") return null;
    const label = readLabel(entry.label);
    if (!label.ok || ids.has(entry.id) || labels.has(label.value.toLowerCase())) return null;
    const covers = readCovers(entry.covers);
    if (covers === null) return null;
    ids.add(entry.id);
    labels.add(label.value.toLowerCase());
    stats.push(covers ? { id: entry.id, label: label.value, covers } : { id: entry.id, label: label.value });
  }
  return stats;
}

function parseSkills(value: unknown, stats: StatDefinition[] | null): SkillDefinition[] | null {
  if (!stats || !Array.isArray(value) || value.length === 0 || value.length > MAX_SKILLS) return null;
  const skills: SkillDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.label !== "string") return null;
    if (typeof entry.statId !== "string" || typeof entry.applies !== "string") return null;
    const label = readLabel(entry.label);
    const applies = readApplies(entry.applies);
    if (!label.ok || !applies.ok || ids.has(entry.id) || labels.has(label.value.toLowerCase())) return null;
    if (!stats.some((stat) => stat.id === entry.statId)) return null;
    ids.add(entry.id);
    labels.add(label.value.toLowerCase());
    skills.push({ id: entry.id, label: label.value, statId: entry.statId, applies: applies.value });
  }
  return skills;
}

function parseTraits(
  value: unknown,
  stats: StatDefinition[] | null,
  max: number,
  fixed: { cap: number; pool: number } | null,
): TraitDefinition[] | null {
  if (!stats || !Array.isArray(value) || value.length > max) return null;
  const traits: TraitDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.label !== "string") return null;
    const label = readLabel(entry.label);
    if (!label.ok || ids.has(entry.id) || labels.has(label.value.toLowerCase())) return null;
    if (!Array.isArray(entry.modifiers) || entry.modifiers.length > MAX_STORED_MODIFIERS) return null;
    const modifiers: TraitModifier[] = [];
    const modifierIds = new Set<string>();
    for (const item of entry.modifiers) {
      const parsed = parseModifier(item, stats, modifierIds);
      if (!parsed) return null;
      modifierIds.add(parsed.id);
      modifiers.push(parsed);
    }
    const classStats = readFixedStats(entry.stats, stats, fixed);
    if (classStats === null) return null;
    const ability = readRacialAbility(entry.ability);
    const choices = readRaceChoices(entry);
    if (ability === null || choices === null) return null;
    ids.add(entry.id);
    labels.add(label.value.toLowerCase());
    const trait: TraitDefinition = { id: entry.id, label: label.value, modifiers };
    if (classStats) trait.stats = classStats;
    if (ability) trait.ability = ability;
    if (choices.statChoices) {
      trait.statChoices = choices.statChoices;
      trait.statChoiceAmount = choices.statChoiceAmount;
    }
    if (choices.extraSkills) trait.extraSkills = choices.extraSkills;
    traits.push(trait);
  }
  return traits;
}

function readRacialAbility(value: unknown): RacialAbility | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.description !== "string") return null;
  const name = readLabel(value.name);
  const description = readApplies(value.description);
  if (!name.ok || !description.ok) return null;
  return { name: name.value, description: description.value };
}

function readRaceChoices(
  value: Record<string, unknown>,
): { statChoices: number; statChoiceAmount: number; extraSkills: number } | null {
  const statChoices = value.statChoices === undefined ? 0 : value.statChoices;
  const statChoiceAmount = value.statChoiceAmount === undefined ? 0 : value.statChoiceAmount;
  const extraSkills = value.extraSkills === undefined ? 0 : value.extraSkills;
  if (statChoices !== 0 && statChoices !== 2) return null;
  if (extraSkills !== 0 && extraSkills !== 1) return null;
  if (typeof statChoices !== "number" || typeof statChoiceAmount !== "number" || typeof extraSkills !== "number") {
    return null;
  }
  if (statChoices === 2 && statChoiceAmount !== 1) return null;
  if (statChoices === 0 && statChoiceAmount !== 0) return null;
  return { statChoices, statChoiceAmount, extraSkills };
}

function signedModifiers(modifiers: TraitModifier[], stats: StatDefinition[]): string {
  return modifiers.map((item) => formatModifier(item, stats)).join(", ");
}

function readFixedStats(
  value: unknown,
  stats: StatDefinition[],
  fixed: { cap: number; pool: number } | null,
): Record<string, number> | null | undefined {
  if (!fixed) return value === undefined ? undefined : null;
  if (!isRecord(value)) return null;
  const assigned: Record<string, number> = {};
  for (const stat of stats) {
    const raw = value[stat.id];
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > fixed.cap) return null;
    assigned[stat.id] = raw;
  }
  if (Object.keys(value).some((key) => !stats.some((stat) => stat.id === key))) return null;
  const sum = stats.reduce((total, stat) => total + (assigned[stat.id] ?? 0), 0);
  if (sum !== fixed.pool) return null;
  return assigned;
}

function readCovers(value: unknown): string | null {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.includes("\n") || value.includes("\r")) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_APPLIES) return null;
  return trimmed;
}

function matchesClassStats(
  options: CharacterOptions,
  classId: string,
  stats: Record<string, number>,
): boolean {
  const chosen = options.classes.find((entry) => entry.id === classId);
  if (!chosen?.stats) return false;
  return options.stats.every((stat) => stats[stat.id] === chosen.stats?.[stat.id]);
}

function parseModifier(
  value: unknown,
  stats: StatDefinition[],
  ids: Set<string>,
): TraitModifier | null {
  if (!isRecord(value) || !isId(value.id) || ids.has(value.id)) return null;
  if (value.kind !== "stat" && value.kind !== "roll") return null;
  if (typeof value.statId !== "string" || typeof value.amount !== "number") return null;
  if (!Number.isInteger(value.amount) || value.amount === 0 || value.amount < -3 || value.amount > 3) {
    return null;
  }
  if (value.kind === "stat" && !stats.some((stat) => stat.id === value.statId)) return null;
  if (value.kind === "roll" && value.statId !== "" && !stats.some((stat) => stat.id === value.statId)) {
    return null;
  }
  return { id: value.id, kind: value.kind, statId: value.statId, amount: value.amount };
}

function isRankedCore(stats: StatDefinition[], pool: number): boolean {
  if (pool !== 3 || stats.length !== 3) return false;
  const ids = stats.map((stat) => stat.id).slice().sort().join(",");
  return ids === "finesse,might,wits";
}

function isPool(value: unknown): value is number {
  return isStoredPool(value, "pool");
}

function isStoredPool(value: unknown, assignment: StatAssignment): value is number {
  const max = assignment === "class" ? MAX_CLASS_POOL : MAX_STAT_POOL;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
