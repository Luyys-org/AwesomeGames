"use client";

import { useState } from "react";

import {
  DEATH_PENALTIES,
  UNIVERSES,
  validateCampaignSettings,
} from "@/rpg/lib/campaign-settings";
import { useHostAi } from "@/rpg/features/landing/use-host-ai";

export function NewCampaignForm() {
  const { ready, linked } = useHostAi();
  const [campaignName, setCampaignName] = useState("");
  const [universe, setUniverse] = useState("");
  const [universeLabel, setUniverseLabel] = useState("");
  const [objective, setObjective] = useState("");
  const [deathPenalty, setDeathPenalty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedName, setAcceptedName] = useState<string | null>(null);

  function clearAccepted() {
    setAcceptedName(null);
    setError(null);
  }

  return (
    <form
      className="panel mt-8 space-y-4 p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        if (!linked) {
          setAcceptedName(null);
          setError("Link an AI provider before you create a game.");
          return;
        }

        const result = validateCampaignSettings({
          campaignName,
          universe,
          universeLabel,
          objective,
          deathPenalty,
        });

        if (!result.ok) {
          setAcceptedName(null);
          setError(result.error);
          return;
        }

        setError(null);
        setAcceptedName(result.value.campaignName);
      }}
    >
      <label className="block text-sm text-zinc-300">
        Campaign name
        <input
          type="text"
          required
          maxLength={60}
          value={campaignName}
          onChange={(event) => {
            setCampaignName(event.target.value);
            clearAccepted();
          }}
          className="field mt-1 w-full"
        />
      </label>

      <label className="block text-sm text-zinc-300">
        Universe
        <select
          required
          value={universe}
          onChange={(event) => {
            setUniverse(event.target.value);
            clearAccepted();
          }}
          className="field mt-1 w-full"
        >
          <option value="">Choose a universe</option>
          {UNIVERSES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      {universe === "custom" ? (
        <label className="block text-sm text-zinc-300">
          Universe name
          <input
            type="text"
            required
            maxLength={40}
            value={universeLabel}
            onChange={(event) => {
              setUniverseLabel(event.target.value);
              clearAccepted();
            }}
            className="field mt-1 w-full"
          />
        </label>
      ) : null}

      <label className="block text-sm text-zinc-300">
        Objective
        <textarea
          required
          maxLength={280}
          rows={4}
          value={objective}
          onChange={(event) => {
            setObjective(event.target.value);
            clearAccepted();
          }}
          className="field mt-1 w-full resize-y"
        />
      </label>

      <label className="block text-sm text-zinc-300">
        Death penalty
        <select
          required
          value={deathPenalty}
          onChange={(event) => {
            setDeathPenalty(event.target.value);
            clearAccepted();
          }}
          className="field mt-1 w-full"
        >
          <option value="">Choose a death penalty</option>
          {DEATH_PENALTIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      {ready && !linked ? (
        <p className="text-sm text-zinc-400">
          Link an AI provider before you create a game.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      {acceptedName ? (
        <p role="status" className="text-sm text-zinc-300">
          {acceptedName} settings accepted.
        </p>
      ) : null}

      <button type="submit" disabled={!ready || !linked} className="btn btn-primary">
        Create game
      </button>
    </form>
  );
}
