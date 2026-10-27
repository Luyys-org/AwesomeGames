"use client";

import { useState } from "react";

import {
  formatSigned,
  formatTraitDetail,
  statLabel,
  type CharacterOptions,
} from "@/rpg/lib/character-options";
import type { CharacterDraft } from "@/rpg/lib/character";

interface CharacterFormProps {
  options: CharacterOptions;
  onSubmit: (draft: CharacterDraft) => Promise<string | null>;
}

interface ClaimFormProps {
  onSubmit: (name: string, claimCode: string) => Promise<string | null>;
}

export function CharacterForm({ options, onSubmit }: CharacterFormProps) {
  const [name, setName] = useState("");
  const [abilityId, setAbilityId] = useState("");
  const [extraAbilityId, setExtraAbilityId] = useState("");
  const [classId, setClassId] = useState("");
  const [raceId, setRaceId] = useState("");
  const [raceStatIds, setRaceStatIds] = useState<[string, string]>(["", ""]);
  const [stats, setStats] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.stats.map((stat) => [stat.id, "0"])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const skill = options.skills.find((entry) => entry.id === abilityId) ?? null;
  const selectedClass = options.classes.find((entry) => entry.id === classId) ?? null;
  const selectedRace = options.races.find((entry) => entry.id === raceId) ?? null;
  const classAssigned = options.assignment === "class";
  const fixedStats = classAssigned ? selectedClass?.stats ?? null : null;
  const cap = options.assignment === "ranked" ? 2 : options.statCap;
  const spent = options.stats.reduce((total, stat) => total + readStatPoints(stats[stat.id]), 0);
  const pointsLeft = options.assignment === "ranked" ? cap : Math.max(0, options.statPool - spent);

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        const assigned = fixedStats
          ? Object.fromEntries(options.stats.map((stat) => [stat.id, String(fixedStats[stat.id] ?? 0)]))
          : stats;
        void onSubmit({
          name,
          abilityId,
          extraAbilityId: selectedRace?.extraSkills ? extraAbilityId : "",
          classId,
          raceId,
          raceStatIds: selectedRace?.statChoices ? raceStatIds.filter((id) => id.length > 0) : [],
          stats: assigned,
        }).then((message) => {
          setPending(false);
          setError(message);
        });
      }}
    >
      <label className="block text-sm text-zinc-300" htmlFor="character-name">
        Name
        <input
          id="character-name"
          type="text"
          required
          maxLength={24}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="field mt-1 w-full"
        />
      </label>

      {options.races.length > 0 ? (
        <ChoiceField
          id="character-race"
          label="Race"
          value={raceId}
          placeholder="Choose a race"
          options={options.races.map((entry) => ({ id: entry.id, label: entry.label }))}
          detail={selectedRace ? formatTraitDetail(selectedRace, options.stats) : null}
          onChange={(value) => {
            setRaceId(value);
            setRaceStatIds(["", ""]);
            setExtraAbilityId("");
          }}
          onClearError={() => setError(null)}
        />
      ) : null}

      {selectedRace?.statChoices === 2 ? (
        <>
          <ChoiceField
            id="character-race-stat-1"
            label="First stat"
            value={raceStatIds[0]}
            placeholder="Choose a stat"
            options={options.stats.map((stat) => ({ id: stat.id, label: stat.label }))}
            detail={null}
            onChange={(value) => {
              setRaceStatIds([value, raceStatIds[1] === value ? "" : raceStatIds[1]]);
            }}
            onClearError={() => setError(null)}
          />
          <ChoiceField
            id="character-race-stat-2"
            label="Second stat"
            value={raceStatIds[1]}
            placeholder="Choose a stat"
            options={options.stats
              .filter((stat) => stat.id !== raceStatIds[0])
              .map((stat) => ({ id: stat.id, label: stat.label }))}
            detail={null}
            onChange={(value) => setRaceStatIds([raceStatIds[0], value])}
            onClearError={() => setError(null)}
          />
        </>
      ) : null}

      {options.classes.length > 0 ? (
        <ChoiceField
          id="character-class"
          label="Class"
          value={classId}
          placeholder="Choose a class"
          options={options.classes.map((entry) => ({ id: entry.id, label: entry.label }))}
          detail={selectedClass ? formatTraitDetail(selectedClass, options.stats) : null}
          onChange={setClassId}
          onClearError={() => setError(null)}
        />
      ) : null}

      <ChoiceField
        id="character-ability"
        label="Skill"
        value={abilityId}
        placeholder="Choose a skill"
        options={options.skills.map((entry) => ({ id: entry.id, label: entry.label }))}
        detail={
          skill
            ? `${statLabel(options, skill.statId)}. Applies when you ${skill.applies}.`
            : null
        }
        onChange={(value) => {
          setAbilityId(value);
          if (extraAbilityId === value) setExtraAbilityId("");
        }}
        onClearError={() => setError(null)}
      />

      {selectedRace?.extraSkills ? (
        <ChoiceField
          id="character-extra-ability"
          label="Second skill"
          value={extraAbilityId}
          placeholder="Choose a second skill"
          options={options.skills
            .filter((entry) => entry.id !== abilityId)
            .map((entry) => ({ id: entry.id, label: entry.label }))}
          detail={null}
          onChange={setExtraAbilityId}
          onClearError={() => setError(null)}
        />
      ) : null}

      <fieldset>
        <legend className="text-sm text-zinc-300">Stats</legend>
        <p className="mt-1 text-sm text-zinc-400">
          {classAssigned
            ? fixedStats
              ? "Your class sets these points."
              : "Choose a class to set these points."
            : options.assignment === "ranked"
              ? "Assign 2, 1, and 0, each once."
              : `Assign up to ${options.statPool} points. Each stat can be at most ${options.statCap}. ${spent} used.`}
        </p>
        <div className="mt-3 space-y-4">
          {options.stats.map((stat) => (
            <StatField
              key={stat.id}
              label={stat.label}
              covers={stat.covers}
              value={fixedStats ? fixedStats[stat.id] ?? 0 : readStatPoints(stats[stat.id])}
              adjustment={raceAdjustment(selectedRace, stat.id, raceStatIds)}
              max={cap}
              pointsLeft={pointsLeft}
              locked={classAssigned}
              onChange={(value) => {
                setStats((current) => ({ ...current, [stat.id]: String(value) }));
                setError(null);
              }}
            />
          ))}
        </div>
      </fieldset>

      {error ? <Alert>{error}</Alert> : null}

      <button type="submit" disabled={pending} className="btn btn-primary">
        Create character
      </button>
    </form>
  );
}

export function ClaimForm({ onSubmit }: ClaimFormProps) {
  const [name, setName] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void onSubmit(name, claimCode.trim().toUpperCase()).then((message) => {
          setPending(false);
          setError(message);
        });
      }}
    >
      <label className="block text-sm text-zinc-300" htmlFor="claim-name">
        Name
        <input
          id="claim-name"
          type="text"
          required
          maxLength={24}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="field mt-1 w-full"
        />
      </label>
      <label className="block text-sm text-zinc-300" htmlFor="claim-code">
        Claim code
        <input
          id="claim-code"
          type="text"
          required
          maxLength={4}
          autoComplete="off"
          spellCheck={false}
          value={claimCode}
          onChange={(event) => {
            setClaimCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 4));
            setError(null);
          }}
          className="field mt-1 w-full font-mono uppercase"
        />
      </label>
      {error ? <Alert>{error}</Alert> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        Claim character
      </button>
    </form>
  );
}

function ChoiceField({
  id,
  label,
  value,
  placeholder,
  options,
  detail,
  onChange,
  onClearError,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: { id: string; label: string }[];
  detail: string | null;
  onChange: (value: string) => void;
  onClearError: () => void;
}) {
  return (
    <label className="block text-sm text-zinc-300" htmlFor={id}>
      {label}
      <select
        id={id}
        required
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onClearError();
        }}
        className="field mt-1 w-full"
      >
        <option value="">{placeholder}</option>
        {options.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
      {detail ? <span className="mt-2 block text-zinc-400">{detail}</span> : null}
    </label>
  );
}

function raceAdjustment(
  race: CharacterOptions["races"][number] | null,
  statId: string,
  chosen: [string, string],
): number {
  if (!race) return 0;
  const fixed = race.modifiers
    .filter((item) => item.kind === "stat" && item.statId === statId)
    .reduce((total, item) => total + item.amount, 0);
  const picked = race.statChoices && chosen.includes(statId) ? race.statChoiceAmount ?? 0 : 0;
  return fixed + picked;
}

function StatField({
  label,
  covers,
  value,
  adjustment,
  max,
  pointsLeft,
  locked,
  onChange,
}: {
  label: string;
  covers?: string;
  value: number;
  adjustment: number;
  max: number;
  pointsLeft: number;
  locked: boolean;
  onChange: (value: number) => void;
}) {
  const atMin = value <= 0;
  const atMax = value >= max || pointsLeft <= 0;
  const bar = (
    <div
      className="flex h-2 min-w-0 flex-1 gap-0.5"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={`h-full min-w-0 flex-1 transition-colors duration-150 ${
            index < value ? "bg-[var(--primary)]" : "bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm text-zinc-300">
        <span>
          {label}
          {covers ? <span className="mt-1 block text-zinc-400">{covers}</span> : null}
        </span>
        <span className="tabular-nums text-zinc-400" aria-live="polite">
          {adjustment === 0 ? value : `${value + adjustment} (${formatSigned(adjustment)})`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {locked ? (
          bar
        ) : (
          <>
            <button
              type="button"
              className={stepButtonClass}
              aria-label={`Decrease ${label}`}
              disabled={atMin}
              onClick={() => onChange(value - 1)}
            >
              −
            </button>
            {bar}
            <button
              type="button"
              className={stepButtonClass}
              aria-label={`Increase ${label}`}
              disabled={atMax}
              onClick={() => onChange(value + 1)}
            >
              +
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function readStatPoints(value: string | undefined): number {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : 0;
}

const stepButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] text-base leading-none text-zinc-200 transition-colors duration-150 hover:border-zinc-500 hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60";

function Alert({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
    >
      {children}
    </p>
  );
}
