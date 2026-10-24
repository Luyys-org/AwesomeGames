"use client";

import { useState } from "react";

import { ABILITIES, type CharacterDraft } from "@/rpg/lib/character";

interface CharacterFormProps {
  onSubmit: (draft: CharacterDraft) => Promise<string | null>;
}

interface ClaimFormProps {
  onSubmit: (name: string, claimCode: string) => Promise<string | null>;
}

export function CharacterForm({ onSubmit }: CharacterFormProps) {
  const [name, setName] = useState("");
  const [abilityId, setAbilityId] = useState("");
  const [might, setMight] = useState("");
  const [finesse, setFinesse] = useState("");
  const [wits, setWits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ability = ABILITIES.find((entry) => entry.id === abilityId) ?? null;

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void onSubmit({ name, abilityId, might, finesse, wits }).then((message) => {
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

      <label className="block text-sm text-zinc-300" htmlFor="character-ability">
        Ability
        <select
          id="character-ability"
          required
          value={abilityId}
          onChange={(event) => {
            setAbilityId(event.target.value);
            setError(null);
          }}
          className="field mt-1 w-full"
        >
          <option value="">Choose an ability</option>
          {ABILITIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        {ability ? (
          <span className="mt-2 block text-zinc-400">
            {ability.stat}. Applies when you {ability.applies}.
          </span>
        ) : null}
      </label>

      <fieldset>
        <legend className="text-sm text-zinc-300">Stats</legend>
        <p className="mt-1 text-sm text-zinc-400">Assign 2, 1, and 0, each once.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatField id="stat-might" label="Might" value={might} onChange={setMight} />
          <StatField id="stat-finesse" label="Finesse" value={finesse} onChange={setFinesse} />
          <StatField id="stat-wits" label="Wits" value={wits} onChange={setWits} />
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

function StatField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
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
        <option value="2">2</option>
        <option value="1">1</option>
        <option value="0">0</option>
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
