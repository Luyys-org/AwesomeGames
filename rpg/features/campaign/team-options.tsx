import type { ReactNode } from "react";

import {
  characterOptionsFor,
  formatModifierList,
  formatTraitDetail,
  statLabel,
  withModifier,
  withModifierPatch,
  withoutModifier,
  withoutSkill,
  withoutStat,
  withoutTrait,
  withSkill,
  withSkillPatch,
  withStat,
  withStatLabel,
  withStatCap,
  withStatPool,
  withTrait,
  withTraitLabel,
  type CharacterOptions,
  type CharacterOptionsDraft,
  type TraitDefinition,
} from "@/rpg/lib/character-options";

interface TeamOptionsProps {
  universe: string;
  draft: CharacterOptionsDraft;
  onChange: (update: (draft: CharacterOptionsDraft) => CharacterOptionsDraft) => void;
  nextId: (prefix: string) => string;
  hidePoolFields?: boolean;
  hideHeader?: boolean;
  abilitiesTitle?: string;
  statsTitle?: string;
  classesTitle?: string;
  racesTitle?: string;
}

export function TeamOptions({
  universe,
  draft,
  onChange,
  nextId,
  hidePoolFields = false,
  hideHeader = false,
  abilitiesTitle = "Skills",
  statsTitle = "Stats",
  classesTitle = "Classes",
  racesTitle = "Races",
}: TeamOptionsProps) {
  const preset = characterOptionsFor(universe);
  if (preset) {
    return (
      <LockedOptions
        options={preset}
        hidePoolFields={hidePoolFields}
        hideHeader={hideHeader}
        abilitiesTitle={abilitiesTitle}
        statsTitle={statsTitle}
        classesTitle={classesTitle}
        racesTitle={racesTitle}
      />
    );
  }
  if (universe !== "custom") return null;

  return (
    <section className="space-y-4" aria-labelledby={hideHeader ? undefined : "character-options-heading"}>
      {hideHeader ? null : (
        <div>
          <h3 id="character-options-heading" className="text-base font-semibold text-zinc-50">
            Character creation
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Players choose one class, one race, and one skill, then assign stats from the pool.
            Bonuses change that stat or the roll.
          </p>
        </div>
      )}

      {hidePoolFields ? null : (
        <>
          <label className="block text-sm text-zinc-300" htmlFor="stat-pool">
            Point pool
            <input
              id="stat-pool"
              type="number"
              required
              min={1}
              max={12}
              inputMode="numeric"
              value={draft.statPool}
              onChange={(event) => onChange((current) => withStatPool(current, event.target.value))}
              className="field mt-1 w-full"
            />
          </label>
          <p className="text-sm text-zinc-400">The most points a player can assign across all stats.</p>

          <label className="block text-sm text-zinc-300" htmlFor="stat-cap">
            Point cap
            <input
              id="stat-cap"
              type="number"
              required
              min={1}
              max={12}
              inputMode="numeric"
              value={draft.statCap}
              onChange={(event) => onChange((current) => withStatCap(current, event.target.value))}
              className="field mt-1 w-full"
            />
          </label>
          <p className="text-sm text-zinc-400">The most points a player can assign to one stat.</p>
        </>
      )}

      <OptionList
        title={statsTitle}
        detail="Players assign these on character creation."
        empty="No stats yet."
        addLabel="Add stat"
        onAdd={() => onChange((current) => withStat(current, nextId("stat")))}
      >
        {draft.stats.map((stat) => (
          <li key={stat.id} className="border-t border-[var(--border)] py-3 first:border-t-0">
            <div className="flex items-end gap-3">
              <label className="block min-w-0 flex-1 text-sm text-zinc-300" htmlFor={`stat-${stat.id}`}>
                Name
                <input
                  id={`stat-${stat.id}`}
                  type="text"
                  required
                  maxLength={24}
                  value={stat.label}
                  onChange={(event) => onChange((current) => withStatLabel(current, stat.id, event.target.value))}
                  className="field mt-1 w-full"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange((current) => withoutStat(current, stat.id))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </OptionList>

      <OptionList
        title={classesTitle}
        detail="Players choose one."
        empty="No classes yet."
        addLabel="Add class"
        onAdd={() => onChange((current) => withTrait(current, "classes", nextId("class")))}
      >
        {draft.classes.map((entry) => (
          <TraitEditor
            key={entry.id}
            list="classes"
            entry={entry}
            draft={draft}
            onChange={onChange}
            nextId={nextId}
          />
        ))}
      </OptionList>

      <OptionList
        title={racesTitle}
        detail="Players choose one."
        empty="No races yet."
        addLabel="Add race"
        onAdd={() => onChange((current) => withTrait(current, "races", nextId("race")))}
      >
        {draft.races.map((entry) => (
          <TraitEditor
            key={entry.id}
            list="races"
            entry={entry}
            draft={draft}
            onChange={onChange}
            nextId={nextId}
          />
        ))}
      </OptionList>

      <OptionList
        title={abilitiesTitle}
        detail="Players choose one. A matching ability adds +2 to that stat's roll."
        empty={`No ${abilitiesTitle.toLowerCase()} yet.`}
        addLabel={`Add ${abilitiesTitle === "Abilities" ? "ability" : "skill"}`}
        onAdd={() => onChange((current) => withSkill(current, nextId("skill")))}
      >
        {draft.skills.map((skill) => (
          <li key={skill.id} className="space-y-3 border-t border-[var(--border)] py-3 first:border-t-0">
            <div className="flex items-end gap-3">
              <label className="block min-w-0 flex-1 text-sm text-zinc-300" htmlFor={`skill-${skill.id}`}>
                Name
                <input
                  id={`skill-${skill.id}`}
                  type="text"
                  required
                  maxLength={24}
                  value={skill.label}
                  onChange={(event) => onChange((current) => withSkillPatch(current, skill.id, { label: event.target.value }))}
                  className="field mt-1 w-full"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange((current) => withoutSkill(current, skill.id))}
              >
                Remove
              </button>
            </div>
            <label className="block text-sm text-zinc-300" htmlFor={`skill-stat-${skill.id}`}>
              Stat
              <select
                id={`skill-stat-${skill.id}`}
                required
                value={skill.statId}
                onChange={(event) => onChange((current) => withSkillPatch(current, skill.id, { statId: event.target.value }))}
                className="field mt-1 w-full"
              >
                <option value="">Choose a stat</option>
                {draft.stats.map((stat) => (
                  <option key={stat.id} value={stat.id}>
                    {stat.label || "Untitled stat"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-zinc-300" htmlFor={`skill-applies-${skill.id}`}>
              Applies when the player tries to
              <input
                id={`skill-applies-${skill.id}`}
                type="text"
                required
                maxLength={80}
                value={skill.applies}
                onChange={(event) => onChange((current) => withSkillPatch(current, skill.id, { applies: event.target.value }))}
                className="field mt-1 w-full"
              />
            </label>
          </li>
        ))}
      </OptionList>
    </section>
  );
}

function LockedOptions({
  options,
  hidePoolFields = false,
  hideHeader = false,
  abilitiesTitle = "Skills",
  statsTitle = "Stats",
  classesTitle = "Classes",
  racesTitle = "Races",
}: {
  options: CharacterOptions;
  hidePoolFields?: boolean;
  hideHeader?: boolean;
  abilitiesTitle?: string;
  statsTitle?: string;
  classesTitle?: string;
  racesTitle?: string;
}) {
  const classAssigned = options.assignment === "class";
  return (
    <section className="space-y-4" aria-labelledby={hideHeader ? undefined : "character-options-heading"}>
      {hideHeader ? null : (
        <div>
          <h3 id="character-options-heading" className="text-base font-semibold text-zinc-50">
            Character creation
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {classAssigned
              ? "Players choose one class, one race, and one skill. The class sets the stats. These stay with the universe."
              : "Players choose one class, one race, and one skill, then assign the stats. These stay with the universe. A custom universe can change them."}
          </p>
        </div>
      )}

      {hidePoolFields ? null : (
        <>
          <div>
            <p className="text-sm text-zinc-300">Point pool</p>
            <p className="mt-1 text-sm text-zinc-50">{options.statPool}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {classAssigned
                ? "The points already assigned by each class."
                : "The most points a player can assign across all stats."}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-300">Point cap</p>
            <p className="mt-1 text-sm text-zinc-50">{options.statCap}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {classAssigned
                ? "The most points a class can put on one stat."
                : "The most points a player can assign to one stat."}
            </p>
          </div>
        </>
      )}

      <LockedList
        title={statsTitle}
        detail={
          classAssigned
            ? "Each class sets these. The note is what the stat covers."
            : "Players assign these on character creation."
        }
      >
        {options.stats.map((stat) => (
          <li key={stat.id} className="border-t border-[var(--border)] py-2 text-sm first:border-t-0">
            <span className="text-zinc-200">{stat.label}</span>
            {stat.covers ? <span className="text-zinc-400">{`. ${stat.covers}.`}</span> : null}
          </li>
        ))}
      </LockedList>

      <LockedTraits title={classesTitle} detail="Players choose one." traits={options.classes} options={options} />
      <LockedTraits title={racesTitle} detail="Players choose one." traits={options.races} options={options} />

      <LockedList
        title={abilitiesTitle}
        detail="Players choose one. A matching ability adds +2 to that stat's roll."
      >
        {options.skills.map((skill) => (
          <li key={skill.id} className="border-t border-[var(--border)] py-2 text-sm first:border-t-0">
            <span className="text-zinc-200">{skill.label}.</span>{" "}
            <span className="text-zinc-400">
              {statLabel(options, skill.statId)}. Applies when you {skill.applies}.
            </span>
          </li>
        ))}
      </LockedList>
    </section>
  );
}

function LockedTraits({
  title,
  detail,
  traits,
  options,
}: {
  title: string;
  detail: string;
  traits: TraitDefinition[];
  options: CharacterOptions;
}) {
  return (
    <LockedList title={title} detail={detail}>
      {traits.map((trait) => (
        <li key={trait.id} className="border-t border-[var(--border)] py-2 text-sm first:border-t-0">
          <span className="text-zinc-200">{trait.label}.</span>{" "}
          <span className="text-zinc-400">{formatTraitDetail(trait, options.stats)}</span>
        </li>
      ))}
    </LockedList>
  );
}

function LockedList({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  const headingId = `locked-${title.toLowerCase()}`;
  return (
    <div>
      <h4 id={headingId} className="text-sm font-semibold text-zinc-50">
        {title}
      </h4>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
      <ul className="mt-2" aria-labelledby={headingId}>
        {children}
      </ul>
    </div>
  );
}

function OptionList({
  title,
  detail,
  empty,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  detail: string;
  empty: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  const headingId = `edit-${title.toLowerCase()}`;
  const items = Array.isArray(children) ? children : [];
  return (
    <div>
      <h4 id={headingId} className="text-sm font-semibold text-zinc-50">
        {title}
      </h4>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
      {items.length === 0 ? <p className="mt-2 text-sm text-zinc-400">{empty}</p> : null}
      <ul className="mt-2" aria-labelledby={headingId}>
        {children}
      </ul>
      <button type="button" className="btn btn-secondary mt-3" onClick={onAdd}>
        {addLabel}
      </button>
    </div>
  );
}

function TraitEditor({
  list,
  entry,
  draft,
  onChange,
  nextId,
}: {
  list: "classes" | "races";
  entry: CharacterOptionsDraft["classes"][number];
  draft: CharacterOptionsDraft;
  onChange: (update: (draft: CharacterOptionsDraft) => CharacterOptionsDraft) => void;
  nextId: (prefix: string) => string;
}) {
  return (
    <li className="space-y-3 border-t border-[var(--border)] py-3 first:border-t-0">
      <div className="flex items-end gap-3">
        <label className="block min-w-0 flex-1 text-sm text-zinc-300" htmlFor={`${list}-${entry.id}`}>
          Name
          <input
            id={`${list}-${entry.id}`}
            type="text"
            required
            maxLength={24}
            value={entry.label}
            onChange={(event) => onChange((current) => withTraitLabel(current, list, entry.id, event.target.value))}
            className="field mt-1 w-full"
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange((current) => withoutTrait(current, list, entry.id))}
        >
          Remove
        </button>
      </div>

      <div>
        <p className="text-sm text-zinc-300">Bonuses</p>
        {entry.modifiers.length === 0 ? <p className="mt-1 text-sm text-zinc-400">None</p> : null}
        <ul className="mt-2 space-y-3">
          {entry.modifiers.map((item) => (
            <li key={item.id} className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-300" htmlFor={`${item.id}-kind`}>
                Changes
                <select
                  id={`${item.id}-kind`}
                  value={item.kind}
                  onChange={(event) =>
                    onChange((current) =>
                      withModifierPatch(current, list, entry.id, item.id, {
                        kind: event.target.value,
                        statId: "",
                      }),
                    )
                  }
                  className="field mt-1 w-full"
                >
                  <option value="stat">Stat</option>
                  <option value="roll">Roll</option>
                </select>
              </label>
              <label className="block text-sm text-zinc-300" htmlFor={`${item.id}-stat`}>
                Stat
                <select
                  id={`${item.id}-stat`}
                  required={item.kind === "stat"}
                  value={item.statId}
                  onChange={(event) =>
                    onChange((current) => withModifierPatch(current, list, entry.id, item.id, { statId: event.target.value }))
                  }
                  className="field mt-1 w-full"
                >
                  <option value="">{item.kind === "roll" ? "Every roll" : "Choose a stat"}</option>
                  {draft.stats.map((stat) => (
                    <option key={stat.id} value={stat.id}>
                      {stat.label || "Untitled stat"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-zinc-300" htmlFor={`${item.id}-amount`}>
                Amount
                <select
                  id={`${item.id}-amount`}
                  required
                  value={item.amount}
                  onChange={(event) =>
                    onChange((current) => withModifierPatch(current, list, entry.id, item.id, { amount: event.target.value }))
                  }
                  className="field mt-1 w-full"
                >
                  {["3", "2", "1", "-1", "-2", "-3"].map((amount) => (
                    <option key={amount} value={amount}>
                      {amount.startsWith("-") ? `−${amount.slice(1)}` : `+${amount}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onChange((current) => withoutModifier(current, list, entry.id, item.id))}
                >
                  Remove bonus
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-secondary mt-3"
          onClick={() => onChange((current) => withModifier(current, list, entry.id, nextId("mod")))}
        >
          Add bonus
        </button>
      </div>
    </li>
  );
}
