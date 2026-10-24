export type StatAssignment = "ranked" | "pool";

export type ModifierKind = "stat" | "roll";

export interface StatDefinition {
  id: string;
  label: string;
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

export interface TraitDefinition {
  id: string;
  label: string;
  modifiers: TraitModifier[];
}

export interface CharacterOptions {
  assignment: StatAssignment;
  statPool: number;
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
const MAX_STATS = 6;
const MAX_SKILLS = 12;
const MAX_TRAITS = 8;
const MAX_MODIFIERS = 4;
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

function modifier(id: string, kind: ModifierKind, statId: string, amount: number): TraitModifier {
  return { id, kind, statId, amount };
}

function trait(id: string, label: string, modifiers: TraitModifier[]): TraitDefinition {
  return { id, label, modifiers };
}

function coreOptions(classes: TraitDefinition[], races: TraitDefinition[]): CharacterOptions {
  return {
    assignment: "ranked",
    statPool: 3,
    stats: CORE_STATS,
    skills: CORE_SKILLS,
    classes,
    races,
  };
}

export const UNIVERSE_CHARACTER_OPTIONS: Record<
  "star-wars" | "dungeons-and-dragons" | "alien",
  CharacterOptions
> = {
  "star-wars": coreOptions(
    [
      trait("sw-soldier", "Soldier", [modifier("sw-soldier-might", "stat", "might", 1)]),
      trait("sw-scoundrel", "Scoundrel", [modifier("sw-scoundrel-finesse", "stat", "finesse", 1)]),
      trait("sw-adept", "Adept", [
        modifier("sw-adept-wits", "stat", "wits", 1),
        modifier("sw-adept-might", "stat", "might", -1),
      ]),
      trait("sw-ace", "Ace", [modifier("sw-ace-finesse", "roll", "finesse", 1)]),
    ],
    [
      trait("sw-human", "Human", [modifier("sw-human-roll", "roll", "", 1)]),
      trait("sw-wookiee", "Wookiee", [
        modifier("sw-wookiee-might", "stat", "might", 1),
        modifier("sw-wookiee-finesse", "stat", "finesse", -1),
      ]),
      trait("sw-twilek", "Twi'lek", [
        modifier("sw-twilek-finesse", "stat", "finesse", 1),
        modifier("sw-twilek-might", "stat", "might", -1),
      ]),
      trait("sw-rodian", "Rodian", [
        modifier("sw-rodian-finesse", "roll", "finesse", 1),
        modifier("sw-rodian-wits", "stat", "wits", -1),
      ]),
    ],
  ),
  "dungeons-and-dragons": coreOptions(
    [
      trait("dnd-fighter", "Fighter", [modifier("dnd-fighter-might", "stat", "might", 1)]),
      trait("dnd-rogue", "Rogue", [modifier("dnd-rogue-finesse", "stat", "finesse", 1)]),
      trait("dnd-wizard", "Wizard", [
        modifier("dnd-wizard-wits", "stat", "wits", 1),
        modifier("dnd-wizard-might", "stat", "might", -1),
      ]),
      trait("dnd-cleric", "Cleric", [modifier("dnd-cleric-wits", "stat", "wits", 1)]),
    ],
    [
      trait("dnd-human", "Human", [modifier("dnd-human-roll", "roll", "", 1)]),
      trait("dnd-elf", "Elf", [
        modifier("dnd-elf-finesse", "stat", "finesse", 1),
        modifier("dnd-elf-might", "stat", "might", -1),
      ]),
      trait("dnd-dwarf", "Dwarf", [
        modifier("dnd-dwarf-might", "stat", "might", 1),
        modifier("dnd-dwarf-finesse", "stat", "finesse", -1),
      ]),
      trait("dnd-halfling", "Halfling", [
        modifier("dnd-halfling-finesse", "roll", "finesse", 1),
        modifier("dnd-halfling-might", "stat", "might", -1),
      ]),
    ],
  ),
  alien: coreOptions(
    [
      trait("alien-marine", "Marine", [modifier("alien-marine-might", "stat", "might", 1)]),
      trait("alien-officer", "Officer", [modifier("alien-officer-wits", "stat", "wits", 1)]),
      trait("alien-scientist", "Scientist", [
        modifier("alien-scientist-wits", "stat", "wits", 1),
        modifier("alien-scientist-might", "stat", "might", -1),
      ]),
      trait("alien-engineer", "Engineer", [modifier("alien-engineer-wits", "roll", "wits", 1)]),
    ],
    [
      trait("alien-human", "Human", [modifier("alien-human-roll", "roll", "", 1)]),
      trait("alien-synthetic", "Synthetic", [
        modifier("alien-synthetic-might", "stat", "might", 1),
        modifier("alien-synthetic-wits", "stat", "wits", -1),
      ]),
      trait("alien-colonist", "Colonist", [
        modifier("alien-colonist-might", "stat", "might", 1),
        modifier("alien-colonist-finesse", "stat", "finesse", -1),
      ]),
      trait("alien-executive", "Executive", [
        modifier("alien-executive-wits", "stat", "wits", 1),
        modifier("alien-executive-might", "stat", "might", -1),
      ]),
    ],
  ),
};

export function emptyCharacterOptionsDraft(): CharacterOptionsDraft {
  return { statPool: "", stats: [], skills: [], classes: [], races: [] };
}

export function characterOptionsFor(universe: string): CharacterOptions | null {
  if (universe === "star-wars" || universe === "dungeons-and-dragons" || universe === "alien") {
    return UNIVERSE_CHARACTER_OPTIONS[universe];
  }
  return null;
}

export function coreCharacterOptions(): CharacterOptions {
  return {
    assignment: "ranked",
    statPool: 3,
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

export function formatModifier(item: TraitModifier, stats: StatDefinition[]): string {
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

export function checkAdjustments(
  options: CharacterOptions,
  classId: string,
  raceId: string,
  statId: string,
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
  return { stat, roll };
}

export function characterSummary(
  character: {
    abilityId: string;
    classId: string;
    raceId: string;
    stats: Record<string, number>;
  },
  options: CharacterOptions,
): string {
  const race = findTrait(options.races, character.raceId)?.label;
  const className = findTrait(options.classes, character.classId)?.label;
  const skill = options.skills.find((entry) => entry.id === character.abilityId)?.label;
  const identity = [race, className, skill].filter((entry): entry is string => Boolean(entry));
  const stats = options.stats.map((stat) => {
    const base = character.stats[stat.id] ?? 0;
    const bonus = checkAdjustments(options, character.classId, character.raceId, stat.id).stat;
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
      stats: stats.value,
      skills: skills.value,
      classes: classes.value,
      races: races.value,
    },
  };
}

export function parseCharacterOptions(value: unknown): CharacterOptions | null {
  if (!isRecord(value)) return null;
  if (value.assignment !== "ranked" && value.assignment !== "pool") return null;
  if (!isPool(value.statPool)) return null;
  const stats = parseNamedList(value.stats, MAX_STATS);
  const skills = parseSkills(value.skills, stats);
  const classes = parseTraits(value.classes, stats);
  const races = parseTraits(value.races, stats);
  if (!stats || stats.length === 0 || !skills || skills.length === 0 || !classes || !races) return null;
  if (classes.length === 0 || races.length === 0) return null;
  if (value.assignment === "ranked" && !isRankedCore(stats, value.statPool)) return null;
  return {
    assignment: value.assignment,
    statPool: value.statPool,
    stats,
    skills,
    classes,
    races,
  };
}

export function parseStatBlock(
  value: unknown,
  options: CharacterOptions,
): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const stats: Record<string, number> = {};
  for (const stat of options.stats) {
    const raw = value[stat.id];
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > options.statPool) {
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

  const sum = numbers.reduce((total, entry) => total + entry, 0);
  if (sum > options.statPool) return null;
  return stats;
}

export function readAssignedStats(
  options: CharacterOptions,
  raw: Record<string, string>,
): Parsed<Record<string, number>> {
  const stats: Record<string, number> = {};
  for (const stat of options.stats) {
    const text = raw[stat.id] ?? "";
    if (!/^\d+$/.test(text)) return { ok: false, error: `Assign ${stat.label}.` };
    const value = Number(text);
    if (!Number.isInteger(value) || value < 0 || value > options.statPool) {
      return { ok: false, error: `${stat.label} must be from 0 to ${options.statPool}.` };
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
    ids.add(entry.id);
    labels.add(label.value.toLowerCase());
    stats.push({ id: entry.id, label: label.value });
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

function parseTraits(value: unknown, stats: StatDefinition[] | null): TraitDefinition[] | null {
  if (!stats || !Array.isArray(value) || value.length > MAX_TRAITS) return null;
  const traits: TraitDefinition[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.label !== "string") return null;
    const label = readLabel(entry.label);
    if (!label.ok || ids.has(entry.id) || labels.has(label.value.toLowerCase())) return null;
    if (!Array.isArray(entry.modifiers) || entry.modifiers.length > MAX_MODIFIERS) return null;
    const modifiers: TraitModifier[] = [];
    const modifierIds = new Set<string>();
    for (const item of entry.modifiers) {
      const parsed = parseModifier(item, stats, modifierIds);
      if (!parsed) return null;
      modifierIds.add(parsed.id);
      modifiers.push(parsed);
    }
    ids.add(entry.id);
    labels.add(label.value.toLowerCase());
    traits.push({ id: entry.id, label: label.value, modifiers });
  }
  return traits;
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
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_STAT_POOL;
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
