"use client";

import {
  CAMPAIGN_STEPS,
  DEATH_PENALTIES,
  ENEMY_DIFFICULTIES,
  LOOT_RARITIES,
  PLAYER_COUNTS,
  PLAYER_FREEDOMS,
  UNIVERSES,
  UNIVERSE_TYPES,
  universePreset,
} from "@/rpg/lib/campaign-settings";
import { useNewCampaign } from "@/rpg/features/campaign/use-new-campaign";

const STEP_LEADS = [
  "A preset fills the later steps. Custom leaves them empty.",
  "How many people are playing, and what happens when a character goes Down.",
  "Opposition, gear, and which actions are permitted.",
];

export function NewCampaignForm() {
  const campaign = useNewCampaign();
  const preset = universePreset(campaign.universe);
  const universeName = UNIVERSES.find((entry) => entry.id === campaign.universe)?.label;
  const enemy =
    ENEMY_DIFFICULTIES.find((entry) => entry.id === campaign.enemyDifficulty) ?? null;
  const loot = LOOT_RARITIES.find((entry) => entry.id === campaign.lootRarity) ?? null;
  const isLast = campaign.step === CAMPAIGN_STEPS.length - 1;

  return (
    <form
      className="panel mt-8 p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        campaign.submit();
      }}
    >
      <div className="tabs" role="tablist" aria-label="Campaign steps">
        {CAMPAIGN_STEPS.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`campaign-step-${entry.id}`}
            aria-selected={campaign.step === index}
            aria-controls="campaign-step-panel"
            disabled={index > campaign.step}
            className={`tab disabled:cursor-not-allowed disabled:opacity-50 ${
              campaign.step === index ? "is-active" : ""
            }`}
            onClick={() => campaign.goToStep(index)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div
        id="campaign-step-panel"
        role="tabpanel"
        aria-labelledby={`campaign-step-${CAMPAIGN_STEPS[campaign.step]?.id}`}
        className="mt-6 space-y-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">
            {CAMPAIGN_STEPS[campaign.step]?.label}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{STEP_LEADS[campaign.step]}</p>
        </div>

        {campaign.step === 0 ? (
          <>
            <label className="block text-sm text-zinc-300" htmlFor="campaign-name">
              Campaign name
              <input
                id="campaign-name"
                type="text"
                required
                maxLength={60}
                value={campaign.campaignName}
                onChange={(event) => campaign.setCampaignName(event.target.value)}
                className="field mt-1 w-full"
              />
            </label>

            <label className="block text-sm text-zinc-300" htmlFor="universe">
              Universe
              <select
                id="universe"
                required
                value={campaign.universe}
                onChange={(event) => campaign.selectUniverse(event.target.value)}
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

            {preset && universeName ? (
              <p className="text-sm text-zinc-400">
                {universeName} filled the later steps. You can change those values.
              </p>
            ) : null}

            {campaign.universe === "custom" ? (
              <>
                <p className="text-sm text-zinc-400">Custom leaves the later steps empty.</p>
                <label className="block text-sm text-zinc-300" htmlFor="universe-name">
                  Universe name
                  <input
                    id="universe-name"
                    type="text"
                    required
                    maxLength={40}
                    value={campaign.universeLabel}
                    onChange={(event) => campaign.setUniverseLabel(event.target.value)}
                    className="field mt-1 w-full"
                  />
                </label>
                <label className="block text-sm text-zinc-300" htmlFor="universe-type">
                  Universe type
                  <select
                    id="universe-type"
                    required
                    value={campaign.universeType}
                    onChange={(event) => campaign.setUniverseType(event.target.value)}
                    className="field mt-1 w-full"
                  >
                    <option value="">Choose a type</option>
                    {UNIVERSE_TYPES.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </>
        ) : null}

        {campaign.step === 1 ? (
          <>
            <div>
              <label className="block text-sm text-zinc-300" htmlFor="player-count">
                Number of players
              </label>
              <select
                id="player-count"
                required
                aria-describedby="player-count-note"
                value={campaign.playerCount}
                onChange={(event) => campaign.setPlayerCount(event.target.value)}
                className="field mt-1 w-full"
              >
                <option value="">Choose a number</option>
                {PLAYER_COUNTS.map((count) => (
                  <option key={count} value={String(count)}>
                    {count} players
                  </option>
                ))}
              </select>
              <p id="player-count-note" className="mt-2 text-sm text-zinc-400">
                Including you.
              </p>
            </div>

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="death-penalty">
                Death penalty
              </label>
              <select
                id="death-penalty"
                required
                aria-describedby="death-penalty-options"
                value={campaign.deathPenalty}
                onChange={(event) => campaign.setDeathPenalty(event.target.value)}
                className="field mt-1 w-full"
              >
                <option value="">Choose a death penalty</option>
                {DEATH_PENALTIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <ul id="death-penalty-options" className="mt-3 space-y-2">
                {DEATH_PENALTIES.map((entry) => (
                  <li key={entry.id} className="text-sm text-zinc-400">
                    <span className="text-zinc-200">{entry.label}.</span> {entry.description}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {campaign.step === 2 ? (
          <>
            <label className="block text-sm text-zinc-300" htmlFor="objective">
              Objective
              <input
                id="objective"
                type="text"
                required
                maxLength={280}
                value={campaign.objective}
                onChange={(event) => campaign.setObjective(event.target.value)}
                className="field mt-1 w-full"
              />
            </label>

            <label className="block text-sm text-zinc-300" htmlFor="enemy-difficulty">
              Enemy difficulty
              <select
                id="enemy-difficulty"
                required
                value={campaign.enemyDifficulty}
                onChange={(event) => campaign.setEnemyDifficulty(event.target.value)}
                className="field mt-1 w-full"
              >
                <option value="">Choose a difficulty</option>
                {ENEMY_DIFFICULTIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              {enemy ? <span className="mt-2 block text-zinc-400">{enemy.description}</span> : null}
            </label>

            <label className="block text-sm text-zinc-300" htmlFor="loot-rarity">
              Loot rarity
              <select
                id="loot-rarity"
                required
                value={campaign.lootRarity}
                onChange={(event) => campaign.setLootRarity(event.target.value)}
                className="field mt-1 w-full"
              >
                <option value="">Choose a rarity</option>
                {LOOT_RARITIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              {loot ? <span className="mt-2 block text-zinc-400">{loot.description}</span> : null}
            </label>

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="player-freedom">
                Player freedom
              </label>
              <select
                id="player-freedom"
                required
                aria-describedby="player-freedom-options"
                value={campaign.playerFreedom}
                onChange={(event) => campaign.setPlayerFreedom(event.target.value)}
                className="field mt-1 w-full"
              >
                <option value="">Choose a level of freedom</option>
                {PLAYER_FREEDOMS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <ul id="player-freedom-options" className="mt-3 space-y-2">
                {PLAYER_FREEDOMS.map((entry) => (
                  <li key={entry.id} className="text-sm text-zinc-400">
                    <span className="text-zinc-200">{entry.label}.</span> {entry.description}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      {campaign.ready && !campaign.linked && isLast ? (
        <p className="mt-4 text-sm text-zinc-400">Link an AI provider before you create a game.</p>
      ) : null}

      {campaign.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {campaign.error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        {campaign.step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={campaign.back}>
            Back
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isLast && (!campaign.ready || !campaign.linked || campaign.submitting)}
          className="btn btn-primary ml-auto"
        >
          {isLast ? "Create game" : "Continue"}
        </button>
      </div>
    </form>
  );
}
