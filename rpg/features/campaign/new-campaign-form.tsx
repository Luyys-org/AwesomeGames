"use client";

import { useRef, type ChangeEvent, type ReactNode } from "react";

import { TeamOptions } from "@/rpg/features/campaign/team-options";
import { useNewCampaign } from "@/rpg/features/campaign/use-new-campaign";
import {
  CAMPAIGN_STEPS,
  UNIVERSES,
  UNIVERSE_TYPES,
} from "@/rpg/lib/campaign-settings";
import {
  BOSS_DIFFICULTIES,
  CAMPAIGN_TAGS,
  MISSION_FAILURE_IMPACTS,
  REPUTATION_TRACKING_OPTIONS,
  GLOBAL_DIFFICULTY_OPTIONS,
  GM_LANGUAGES,
  SETTING_LEVELS,
  type CampaignConfigurationInput,
} from "@/rpg/lib/campaign-tab-config";
import {
  DEATH_RECOVERY_OPTIONS,
  EQUIPMENT_VALIDATION_RULES,
  type CharacterConfigurationInput,
} from "@/rpg/lib/character-tab-config";

const STEP_LEADS = [
  "Universe, narrative context, challenge tuning, rewards, exploration, and house rules for the AI game master.",
  "Party size, creation rules, statistics, equipment, and morality settings for player characters.",
];

const fieldSpanClass = (fullWidth: boolean) => (fullWidth ? "lg:col-span-2" : "");

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-800 pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-zinc-500">{children}</p>;
}

function TextField({
  id,
  label,
  description,
  value,
  onChange,
  required,
  maxLength,
  fullWidth = false,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
}) {
  return (
    <div className={fieldSpanClass(fullWidth)}>
      <label className="block text-sm text-zinc-300" htmlFor={id}>
        {label}
      </label>
      <FieldDescription>{description}</FieldDescription>
      <input
        id={id}
        type="text"
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-2 w-full"
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  description,
  value,
  onChange,
  required,
  maxLength,
  rows = 4,
  fullWidth = true,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  fullWidth?: boolean;
}) {
  return (
    <div className={fieldSpanClass(fullWidth)}>
      <label className="block text-sm text-zinc-300" htmlFor={id}>
        {label}
      </label>
      <FieldDescription>{description}</FieldDescription>
      <textarea
        id={id}
        required={required}
        maxLength={maxLength}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-2 w-full resize-y"
      />
    </div>
  );
}

function SelectField<K extends string>({
  id,
  label,
  description,
  value,
  onChange,
  required,
  placeholder,
  options,
  fullWidth = false,
}: {
  id: string;
  label: string;
  description: string;
  value: K | "";
  onChange: (value: K) => void;
  required?: boolean;
  placeholder: string;
  options: { id: K; label: string }[];
  fullWidth?: boolean;
}) {
  return (
    <div className={fieldSpanClass(fullWidth)}>
      <label className="block text-sm text-zinc-300" htmlFor={id}>
        {label}
      </label>
      <FieldDescription>{description}</FieldDescription>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value as K)}
        className="field mt-2 w-full"
      >
        <option value="">{placeholder}</option>
        {options.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  id,
  label,
  description,
  checked,
  onChange,
  fullWidth = false,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${fieldSpanClass(fullWidth)}`.trim()}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 rounded border-zinc-600 bg-zinc-900"
      />
      <div>
        <label className="block text-sm text-zinc-300" htmlFor={id}>
          {label}
        </label>
        <FieldDescription>{description}</FieldDescription>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  description,
  value,
  onChange,
  required,
  min = 1,
  max,
  disabled,
  fullWidth = false,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fieldSpanClass(fullWidth)}>
      <label className="block text-sm text-zinc-300" htmlFor={id}>
        {label}
      </label>
      <FieldDescription>{description}</FieldDescription>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-2 w-full"
      />
    </div>
  );
}

function CampaignTabPanel({
  campaign,
}: {
  campaign: ReturnType<typeof useNewCampaign>;
}) {
  const config = campaign.campaignConfiguration;
  const patch = (fields: Partial<CampaignConfigurationInput>) => campaign.patchConfiguration(fields);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      campaign.importCampaignSettings(parsed);
    } catch {
      campaign.importCampaignSettings(undefined);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelectField
          id="gm-language"
          label="Language"
          description="Language the game master uses for narration, names, and spoken replies."
          value={config.language}
          onChange={(value) => patch({ language: value })}
          required
          placeholder="Choose a language"
          options={GM_LANGUAGES}
        />
      </div>
      <div className="lg:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SelectField
          id="global-difficulty"
          label="Global difficulty"
          description="Prefills dropdown settings below. Text fields, tags, checkboxes, and level inputs stay as they are."
          value={campaign.globalDifficulty}
          onChange={(value) => campaign.selectGlobalDifficulty(value)}
          placeholder="Choose global difficulty"
          options={GLOBAL_DIFFICULTY_OPTIONS}
        />
        <div className="flex flex-wrap gap-2 pb-0.5">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => campaign.exportCampaignSettings()}
          >
            Export settings
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => importInputRef.current?.click()}
          >
            Import settings
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void onImportFile(event)}
          />
        </div>
      </div>

      <FormSection title="Basic Information">
        <TextField
          id="campaign-name"
          label="Campaign name"
          description="For display purpose only."
          value={campaign.campaignName}
          onChange={campaign.setCampaignName}
          required
          maxLength={60}
        />

        {campaign.presetsStatus === "loading" ? (
          <p className="text-sm text-zinc-400 lg:col-span-2">Loading universes.</p>
        ) : null}
        {campaign.presetsStatus === "failed" ? (
          <p className="text-sm text-zinc-400 lg:col-span-2">Preset universes could not be loaded.</p>
        ) : null}

        <div className="min-w-0">
          <label className="block text-sm text-zinc-300" htmlFor="universe">
            Universe
          </label>
          <FieldDescription>To prefill entries for a faster startup.</FieldDescription>
          <select
            id="universe"
            required
            disabled={campaign.presetsStatus === "loading"}
            value={campaign.universe}
            onChange={(event) => campaign.selectUniverse(event.target.value)}
            className="field mt-2 w-full"
          >
            <option value="">Choose a universe</option>
            {UNIVERSES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        {campaign.universe === "custom" ? (
          <>
            <TextField
              id="universe-name"
              label="Universe name"
              description="Display name for your custom universe."
              value={campaign.universeLabel}
              onChange={campaign.setUniverseLabel}
              required
              maxLength={40}
            />
            <div>
              <label className="block text-sm text-zinc-300" htmlFor="universe-type">
                Universe type
              </label>
              <FieldDescription>Genre framing for generated fiction.</FieldDescription>
              <select
                id="universe-type"
                required
                value={campaign.universeType}
                onChange={(event) => campaign.setUniverseType(event.target.value)}
                className="field mt-2 w-full"
              >
                <option value="">Choose a type</option>
                {UNIVERSE_TYPES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        <TextAreaField
          id="short-description"
          label="Short description"
          description="For agent context, when generating encounters, events, loots, etc."
          value={config.shortDescription}
          onChange={(value) => patch({ shortDescription: value })}
          required
          maxLength={2000}
        />

        <TextAreaField
          id="objective"
          label="Objective"
          description="For agent context on main quest, to keep it focused on objectives to give to the players."
          value={campaign.objective}
          onChange={campaign.setObjective}
          required
          maxLength={2000}
        />

        <fieldset className="min-w-0 lg:col-span-2">
          <legend className="block text-sm text-zinc-300">Campaign tags</legend>
          <FieldDescription>
            For agent context when generating events and to focus specific syntax on text generation.
          </FieldDescription>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CAMPAIGN_TAGS.map((entry) => {
              const checked = config.campaignTags.includes(entry.id);
              return (
                <label key={entry.id} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      campaign.toggleCampaignTag(entry.id, event.target.checked)
                    }
                    className="size-4 rounded border-zinc-600 bg-zinc-900"
                  />
                  {entry.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <TextAreaField
          id="gm-notes"
          label="GM notes"
          description="For agent context, to give any relevant information that is not included in the previous fields."
          value={config.gmNotes}
          onChange={(value) => patch({ gmNotes: value })}
          required
          maxLength={4000}
          rows={5}
        />
      </FormSection>

      <FormSection title="Difficulty & Challenge">
        <SelectField
          id="enemy-difficulty"
          label="Enemy difficulty"
          description="Enemies global stats (HP, armor, abilities, etc.)."
          value={config.enemyDifficulty}
          onChange={(value) => patch({ enemyDifficulty: value })}
          required
          placeholder="Choose enemy difficulty"
          options={BOSS_DIFFICULTIES}
        />
        <SelectField
          id="boss-difficulty"
          label="Boss difficulty"
          description="Bosses global stats (HP, armor, abilities, etc.)."
          value={config.bossDifficulty}
          onChange={(value) => patch({ bossDifficulty: value })}
          required
          placeholder="Choose boss difficulty"
          options={BOSS_DIFFICULTIES}
        />
        <SelectField
          id="encounter-frequency"
          label="Encounter frequency"
          description="How frequently players encounter enemies or bosses."
          value={config.encounterFrequency}
          onChange={(value) => patch({ encounterFrequency: value })}
          required
          placeholder="Choose encounter frequency"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="healing-availability"
          label="Healing availability"
          description="How easy it is to find healing items."
          value={config.healingAvailability}
          onChange={(value) => patch({ healingAvailability: value })}
          required
          placeholder="Choose healing availability"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="resurrection-availability"
          label="Resurrection availability"
          description="How easy it is to resurrect dead allies."
          value={config.resurrectionAvailability}
          onChange={(value) => patch({ resurrectionAvailability: value })}
          required
          placeholder="Choose resurrection availability"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="investigation-difficulty"
          label="Investigation difficulty"
          description="How easy it is to investigate and succeed in ability-based events."
          value={config.investigationDifficulty}
          onChange={(value) => patch({ investigationDifficulty: value })}
          required
          placeholder="Choose investigation difficulty"
          options={SETTING_LEVELS}
        />
      </FormSection>

      <FormSection title="Reward System">
        <SelectField
          id="loot-rarity"
          label="Loot rarity"
          description="How rare found items are."
          value={config.lootRarity}
          onChange={(value) => patch({ lootRarity: value })}
          required
          placeholder="Choose loot rarity"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="loot-quantity"
          label="Loot quantity"
          description="How often items are found."
          value={config.lootQuantity}
          onChange={(value) => patch({ lootQuantity: value })}
          required
          placeholder="Choose loot quantity"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="currency-abundance"
          label="Currency abundance"
          description="Quantity of currency found and available across merchants."
          value={config.currencyAbundance}
          onChange={(value) => patch({ currencyAbundance: value })}
          required
          placeholder="Choose currency abundance"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="unique-artifact-frequency"
          label="Unique artifact frequency"
          description="How often a unique artifact appears instead of a standard item."
          value={config.uniqueArtifactFrequency}
          onChange={(value) => patch({ uniqueArtifactFrequency: value })}
          required
          placeholder="Choose unique artifact frequency"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="resource-scarcity"
          label="Resource scarcity"
          description="Global amount of resource scattered per single action."
          value={config.resourceScarcity}
          onChange={(value) => patch({ resourceScarcity: value })}
          required
          placeholder="Choose resource scarcity"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="reputation-reward-multiplier"
          label="Reputation reward multiplier"
          description="How fast reputation gain increases or decreases."
          value={config.reputationRewardMultiplier}
          onChange={(value) => patch({ reputationRewardMultiplier: value })}
          required
          placeholder="Choose reputation reward multiplier"
          options={SETTING_LEVELS}
        />
      </FormSection>

      <FormSection title="Exploration">
        <SelectField
          id="player-freedom"
          label="Player freedom"
          description="How free players are, including travel, actions, or NPC discussion."
          value={config.playerFreedom}
          onChange={(value) => patch({ playerFreedom: value })}
          required
          placeholder="Choose player freedom"
          options={SETTING_LEVELS}
        />
        <CheckboxField
          id="fast-travel"
          label="Fast travel availability"
          description="If fast travel is permitted, with a cost on use."
          checked={config.fastTravelAvailable}
          onChange={(checked) => patch({ fastTravelAvailable: checked })}
        />
        <SelectField
          id="discovery-importance"
          label="Discovery importance"
          description="How rewarded discovery is."
          value={config.discoveryImportance}
          onChange={(value) => patch({ discoveryImportance: value })}
          required
          placeholder="Choose discovery importance"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="random-encounter-frequency"
          label="Random encounter frequency"
          description="How frequently a random encounter event occurs (friendly or neutral NPC only)."
          value={config.randomEncounterFrequency}
          onChange={(value) => patch({ randomEncounterFrequency: value })}
          required
          placeholder="Choose random encounter frequency"
          options={SETTING_LEVELS}
        />
      </FormSection>

      <FormSection title="Narrative Configuration">
        <SelectField
          id="side-quest-density"
          label="Side quest density"
          description="How frequently side quests are given."
          value={config.sideQuestDensity}
          onChange={(value) => patch({ sideQuestDensity: value })}
          required
          placeholder="Choose side quest density"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="moral-choice-impact"
          label="Moral choice impact"
          description="How morality impacts event outcomes."
          value={config.moralChoiceImpact}
          onChange={(value) => patch({ moralChoiceImpact: value })}
          required
          placeholder="Choose moral choice impact"
          options={SETTING_LEVELS}
        />
        <CheckboxField
          id="faction-influence"
          label="Faction influence"
          description="Whether faction influence is included."
          checked={config.factionInfluence}
          onChange={(checked) => patch({ factionInfluence: checked })}
        />
      </FormSection>

      <FormSection title="PvP Configuration">
        <CheckboxField
          id="pvp-allowed"
          label="PvP allowed"
          description="Whether players can hurt each other."
          checked={config.pvpAllowed}
          onChange={(checked) => patch({ pvpAllowed: checked })}
        />
        <CheckboxField
          id="theft-between-players"
          label="Theft between players"
          description="Whether players can steal from each other."
          checked={config.theftBetweenPlayers}
          onChange={(checked) => patch({ theftBetweenPlayers: checked })}
        />
        <CheckboxField
          id="secret-objectives"
          label="Secret objectives"
          description="Whether players can receive secret betrayal win conditions."
          checked={config.secretObjectives}
          onChange={(checked) => patch({ secretObjectives: checked })}
        />
      </FormSection>

      <FormSection title="Death & Failure">
        <CheckboxField
          id="campaign-can-fail"
          label="Campaign can be failed"
          description="Whether the campaign can be lost based on predetermined conditions such as player or NPC death."
          checked={config.campaignCanFail}
          onChange={(checked) => patch({ campaignCanFail: checked })}
        />
        <SelectField
          id="mission-failure-impact"
          label="Mission failure impact"
          description="Impact on NPCs or characters for failing a quest."
          value={config.missionFailureImpact}
          onChange={(value) => patch({ missionFailureImpact: value })}
          required
          placeholder="Choose mission failure impact"
          options={MISSION_FAILURE_IMPACTS}
        />
      </FormSection>

      <FormSection title="NPC System">
        <CheckboxField
          id="npc-mortality"
          label="NPC mortality"
          description="Whether NPCs can be killed by enemies, the environment, or characters."
          checked={config.npcMortality}
          onChange={(checked) => patch({ npcMortality: checked })}
        />
        <SelectField
          id="reputation-tracking"
          label="Reputation tracking"
          description="Whether NPC factions track player reputation based on quest success, failure, theft, murder, etc."
          value={config.reputationTracking}
          onChange={(value) => patch({ reputationTracking: value })}
          required
          placeholder="Choose reputation tracking"
          options={REPUTATION_TRACKING_OPTIONS}
        />
      </FormSection>

      <FormSection title="Progression Rules">
        <NumberField
          id="level-cap"
          label="Level cap"
          description="Maximum level a character can reach."
          value={config.levelCap}
          onChange={(value) => patch({ levelCap: value })}
          required
        />
        <NumberField
          id="milestone-progression"
          label="Milestone progression"
          description="Levels gained to earn rewards such as skill points or items."
          value={config.milestoneProgression}
          onChange={(value) => patch({ milestoneProgression: value })}
          required
        />
        <SelectField
          id="experience-gain-multiplier"
          label="Experience gain multiplier"
          description="How fast experience increases."
          value={config.experienceGainMultiplier}
          onChange={(value) => patch({ experienceGainMultiplier: value })}
          required
          placeholder="Choose experience gain multiplier"
          options={SETTING_LEVELS}
        />
      </FormSection>
    </div>
  );
}

function CharacterTabPanel({
  campaign,
}: {
  campaign: ReturnType<typeof useNewCampaign>;
}) {
  const config = campaign.characterConfiguration;
  const patch = (fields: Partial<CharacterConfigurationInput>) =>
    campaign.patchCharacterConfiguration(fields);
  const poolLocked = !campaign.isCustomUniverse && campaign.presetCharacterOptions !== null;

  return (
    <div className="space-y-2">
      <FormSection title="Player Setup">
        <NumberField
          id="player-count"
          label="Number of players"
          description="Number of expected players, including you (1–6)."
          value={config.playerCount}
          onChange={(value) => patch({ playerCount: value })}
          required
          min={1}
          max={6}
        />
      </FormSection>

      <FormSection title="Character Creation Rules">
        <NumberField
          id="point-pool"
          label="Point pool"
          description="Point pool to assign across stats."
          value={config.pointPool}
          onChange={(value) => patch({ pointPool: value })}
          required
          min={1}
          max={12}
          disabled={poolLocked}
        />
        <NumberField
          id="point-cap-per-ability"
          label="Point cap per ability"
          description="Maximum points a single ability (stat) can be set to."
          value={config.pointCapPerAbility}
          onChange={(value) => patch({ pointCapPerAbility: value })}
          required
          min={1}
          max={12}
          disabled={poolLocked}
        />
        {poolLocked ? (
          <p className="text-sm text-zinc-400 lg:col-span-2">
            Point pool and cap come from the chosen universe and stay fixed for preset universes.
          </p>
        ) : null}
        <SelectField
          id="starting-equipment"
          label="Starting equipment"
          description="How much equipment is given to players at start."
          value={config.startingEquipment}
          onChange={(value) => patch({ startingEquipment: value })}
          required
          placeholder="Choose starting equipment"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="starting-wealth"
          label="Starting wealth"
          description="How much money is given to players at start."
          value={config.startingWealth}
          onChange={(value) => patch({ startingWealth: value })}
          required
          placeholder="Choose starting wealth"
          options={SETTING_LEVELS}
        />
        <SelectField
          id="death-recovery"
          label="Death & recovery"
          description="What happens when a character is removed from play."
          value={config.deathRecovery}
          onChange={(value) => patch({ deathRecovery: value })}
          required
          placeholder="Choose death and recovery"
          options={DEATH_RECOVERY_OPTIONS}
        />
        <CheckboxField
          id="injury-system"
          label="Injury system"
          description="Whether characters can be injured by wounds."
          checked={config.injurySystem}
          onChange={(checked) => patch({ injurySystem: checked })}
        />
        <CheckboxField
          id="permanent-wounds"
          label="Permanent wounds"
          description="Whether characters can be permanently wounded; permanent wounds cannot be cured."
          checked={config.permanentWounds}
          onChange={(checked) => patch({ permanentWounds: checked })}
        />
      </FormSection>

      <FormSection title="Statistics">
        <div className="min-w-0 lg:col-span-2">
          <TeamOptions
            universe={campaign.universe}
            draft={campaign.optionsDraft}
            onChange={campaign.setOptionsDraft}
            nextId={campaign.nextOptionId}
            hidePoolFields
            hideHeader
            abilitiesTitle="Available abilities"
            statsTitle="Available stats"
            classesTitle="Available classes"
            racesTitle="Available races"
          />
        </div>

        <CheckboxField
          id="equipment-rules"
          label="Equipment rules"
          description="Whether equipment needs validation before being equipped."
          checked={config.equipmentRules}
          onChange={(checked) => patch({ equipmentRules: checked })}
        />

        {config.equipmentRules ? (
          <fieldset className="min-w-0 lg:col-span-2">
            <legend className="block text-sm text-zinc-300">Equipment validation rules</legend>
            <FieldDescription>
              Requirements checked before a character can equip an item.
            </FieldDescription>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {EQUIPMENT_VALIDATION_RULES.map((entry) => (
                <label key={entry.id} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.equipmentValidationRules[entry.id]}
                    onChange={(event) =>
                      campaign.toggleEquipmentValidationRule(entry.id, event.target.checked)
                    }
                    className="size-4 rounded border-zinc-600 bg-zinc-900"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <CheckboxField
          id="weight-system"
          label="Weight system"
          description="Enable carrying weight; overloading affects stats."
          checked={config.weightSystem}
          onChange={(checked) => patch({ weightSystem: checked })}
        />
        <CheckboxField
          id="ammunition-tracking"
          label="Ammunition tracking"
          description="Whether ammunition use is tracked."
          checked={config.ammunitionTracking}
          onChange={(checked) => patch({ ammunitionTracking: checked })}
        />
      </FormSection>

      <FormSection title="Sanity / Morality">
        <CheckboxField
          id="morality-tracking"
          label="Morality tracking"
          description="Whether the morality system is enabled."
          checked={config.moralityTracking}
          onChange={(checked) => patch({ moralityTracking: checked })}
        />
        <CheckboxField
          id="sanity-system"
          label="Sanity system"
          description="Whether the sanity system is enabled; useful for horror-based campaigns."
          checked={config.sanitySystem}
          onChange={(checked) => patch({ sanitySystem: checked })}
        />
      </FormSection>
    </div>
  );
}

export function NewCampaignForm() {
  const campaign = useNewCampaign();
  const isLast = campaign.step === CAMPAIGN_STEPS.length - 1;

  return (
    <form
      className="panel mt-8 w-full p-6 lg:p-8"
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

        {campaign.step === 0 ? <CampaignTabPanel campaign={campaign} /> : null}

        {campaign.step === 1 ? <CharacterTabPanel campaign={campaign} /> : null}
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
          disabled={
            campaign.presetsStatus === "loading" ||
            (isLast && (!campaign.ready || !campaign.linked || campaign.submitting))
          }
          className="btn btn-primary ml-auto"
        >
          {isLast ? (campaign.submitting ? "Generating opening…" : "Create game") : "Continue"}
        </button>
      </div>
    </form>
  );
}
