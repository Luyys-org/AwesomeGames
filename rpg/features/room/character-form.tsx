"use client";

import { useState } from "react";

import {
  formatModifierList,
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
  const [classId, setClassId] = useState("");
  const [raceId, setRaceId] = useState("");
  const [stats, setStats] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const skill = options.skills.find((entry) => entry.id === abilityId) ?? null;
  const selectedClass = options.classes.find((entry) => entry.id === classId) ?? null;
  const selectedRace = options.races.find((entry) => entry.id === raceId) ?? null;
  const spent = options.stats.reduce((total, stat) => {
    const value = stats[stat.id] ?? "";
    return /^\d+$/.test(value) ? total + Number(value) : total;
  }, 0);

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void onSubmit({ name, abilityId, classId, raceId, stats }).then((message) => {
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
          detail={selectedRace ? formatModifierList(selectedRace.modifiers, options.stats) : null}
          onChange={setRaceId}
          onClearError={() => setError(null)}
        />
      ) : null}

      {options.classes.length > 0 ? (
        <ChoiceField
          id="character-class"
          label="Class"
          value={classId}
          placeholder="Choose a class"
          options={options.classes.map((entry) => ({ id: entry.id, label: entry.label }))}
          detail={selectedClass ? formatModifierList(selectedClass.modifiers, options.stats) : null}
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
        onChange={setAbilityId}
        onClearError={() => setError(null)}
      />

      <fieldset>
        <legend className="text-sm text-zinc-300">Stats</legend>
        <p className="mt-1 text-sm text-zinc-400">
          {options.assignment === "ranked"
            ? "Assign 2, 1, and 0, each once."
            : `Assign up to ${options.statPool} points. ${spent} used.`}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {options.stats.map((stat) => (
            <StatField
              key={stat.id}
              id={`stat-${stat.id}`}
              label={stat.label}
              value={stats[stat.id] ?? ""}
              max={options.assignment === "ranked" ? 2 : options.statPool}
              onChange={(value) => {
                setStats((current) => ({ ...current, [stat.id]: value }));
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

function StatField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
}) {
  const choices = Array.from({ length: max + 1 }, (_, index) => String(index));
  return (
    <label className="block text-sm text-zinc-300" htmlFor={id}>
      {label}
      <select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-1 w-full"
      >
        <option value="">Choose</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
  );
}

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
