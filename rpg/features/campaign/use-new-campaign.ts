"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useHostAi } from "@/rpg/features/landing/use-host-ai";
import {
  CAMPAIGN_STEPS,
  type CampaignSettings,
  type CampaignSettingsInput,
  universePreset,
  validateCampaignSettings,
  validateCampaignStep,
} from "@/rpg/lib/campaign-settings";
import {
  applyGlobalDifficultyPrefill,
  configEnemyDifficultyFromLegacy,
  configLootRarityFromLegacy,
  configPlayerFreedomFromLegacy,
  emptyCampaignConfigurationInput,
  type CampaignConfigurationInput,
  type CampaignTagId,
  type GlobalDifficultyId,
} from "@/rpg/lib/campaign-tab-config";
import {
  deathRecoveryFromLegacy,
  emptyCharacterConfigurationInput,
  type CharacterConfigurationInput,
  type EquipmentValidationRuleId,
} from "@/rpg/lib/character-tab-config";
import {
  characterOptionsFor,
  emptyCharacterOptionsDraft,
  type CharacterOptionsDraft,
} from "@/rpg/lib/character-options";
import {
  buildNewCampaignSettingsExport,
  campaignSettingsExportFilename,
  parseNewCampaignSettingsImport,
} from "@/rpg/lib/campaign-settings-import-export";
import { readHostAi } from "@/rpg/lib/host-ai";
import { generateOpeningSituation } from "@/rpg/lib/host-situation";
import { rememberJourney } from "@/rpg/lib/journey";
import { writeHostSession } from "@/rpg/lib/host-session";
import { createRoomCode } from "@/rpg/lib/room-code";
import { createTable } from "@/rpg/lib/table";
import { paths } from "@/rpg/paths";
import { ensureUniversePresets } from "@/rpg/lib/universe-presets";

const EMPTY_PREFILL = {
  universeLabel: "",
  universeType: "",
};

function presetCharacterConfiguration(
  universe: string,
  playerCount: number,
  deathPenalty: Parameters<typeof deathRecoveryFromLegacy>[0],
): CharacterConfigurationInput {
  const options = characterOptionsFor(universe);
  return {
    ...emptyCharacterConfigurationInput(),
    playerCount: String(playerCount),
    deathRecovery: deathRecoveryFromLegacy(deathPenalty),
    pointPool: options ? String(options.statPool) : "",
    pointCapPerAbility: options ? String(options.statCap) : "",
  };
}

export function useNewCampaign() {
  const router = useRouter();
  const { ready, linked } = useHostAi();
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [universe, setUniverse] = useState("");
  const [universeLabel, setUniverseLabel] = useState("");
  const [universeType, setUniverseType] = useState("");
  const [objective, setObjective] = useState("");
  const [globalDifficulty, setGlobalDifficulty] = useState<GlobalDifficultyId | "">("");
  const [campaignConfiguration, setCampaignConfiguration] = useState<CampaignConfigurationInput>(
    emptyCampaignConfigurationInput,
  );
  const [characterConfiguration, setCharacterConfiguration] = useState<CharacterConfigurationInput>(
    emptyCharacterConfigurationInput,
  );
  const [optionsDraft, setOptionsDraft] = useState<CharacterOptionsDraft>(emptyCharacterOptionsDraft);
  const [presetsStatus, setPresetsStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const optionIds = useRef(1);

  const input: CampaignSettingsInput = {
    campaignName,
    universe,
    universeLabel,
    universeType,
    objective,
    campaignConfiguration,
    characterConfiguration,
  };

  useEffect(() => {
    let active = true;
    void ensureUniversePresets().then(
      () => {
        if (active) setPresetsStatus("ready");
      },
      () => {
        if (active) setPresetsStatus("failed");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  function clearResult() {
    setError(null);
  }

  function edit(apply: () => void) {
    apply();
    clearResult();
  }

  function nextOptionId(prefix: string) {
    const id = `${prefix}${optionIds.current}`;
    optionIds.current += 1;
    return id;
  }

  function resetOptions() {
    optionIds.current = 1;
    setOptionsDraft(emptyCharacterOptionsDraft());
  }

  function applyPresetToConfiguration(preset: NonNullable<ReturnType<typeof universePreset>>) {
    setCampaignConfiguration((current) => ({
      ...current,
      enemyDifficulty: configEnemyDifficultyFromLegacy(preset.enemyDifficulty),
      bossDifficulty: configEnemyDifficultyFromLegacy(preset.enemyDifficulty),
      lootRarity: configLootRarityFromLegacy(preset.lootRarity),
      playerFreedom: configPlayerFreedomFromLegacy(preset.playerFreedom),
    }));
  }

  function selectUniverse(value: string) {
    setUniverse(value);
    clearResult();
    resetOptions();

    const preset = universePreset(value);
    if (!preset) {
      setUniverseLabel(EMPTY_PREFILL.universeLabel);
      setUniverseType(EMPTY_PREFILL.universeType);
      setGlobalDifficulty("");
      setCampaignConfiguration(emptyCampaignConfigurationInput());
      setCharacterConfiguration(emptyCharacterConfigurationInput());
      return;
    }

    setUniverseLabel("");
    setUniverseType(preset.universeType);
    applyPresetToConfiguration(preset);
    setCharacterConfiguration(
      presetCharacterConfiguration(value, preset.playerCount, preset.deathPenalty),
    );
  }

  function patchConfiguration(patch: Partial<CampaignConfigurationInput>) {
    setCampaignConfiguration((current) => ({ ...current, ...patch }));
  }

  function selectGlobalDifficulty(difficulty: GlobalDifficultyId | "") {
    setGlobalDifficulty(difficulty);
    if (!difficulty) return;
    setCampaignConfiguration((current) => applyGlobalDifficultyPrefill(current, difficulty));
  }

  function exportCampaignSettings() {
    const payload = buildNewCampaignSettingsExport({
      globalDifficulty,
      campaignName,
      universe,
      universeLabel,
      universeType,
      objective,
      campaignConfiguration,
      characterConfiguration,
      characterOptionsDraft: optionsDraft,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = campaignSettingsExportFilename(campaignName);
    anchor.click();
    URL.revokeObjectURL(url);
    clearResult();
  }

  function importCampaignSettings(raw: unknown): string | null {
    if (raw === null || raw === undefined) {
      const message = "Import file is not valid JSON.";
      setError(message);
      return message;
    }
    const parsed = parseNewCampaignSettingsImport(raw);
    if (!parsed.ok) {
      setError(parsed.error);
      return parsed.error;
    }

    const data = parsed.value;
    setGlobalDifficulty(data.globalDifficulty);
    setCampaignName(data.campaignName);
    setUniverse(data.universe);
    setUniverseLabel(data.universeLabel);
    setUniverseType(data.universeType);
    setObjective(data.objective);
    setCampaignConfiguration(data.campaignConfiguration);
    if (data.characterConfiguration) {
      setCharacterConfiguration(data.characterConfiguration);
      setOptionsDraft(data.characterOptionsDraft ?? emptyCharacterOptionsDraft());
    }
    clearResult();
    return null;
  }

  function patchCharacterConfiguration(patch: Partial<CharacterConfigurationInput>) {
    setCharacterConfiguration((current) => {
      const next = { ...current, ...patch };
      if (patch.pointPool !== undefined || patch.pointCapPerAbility !== undefined) {
        setOptionsDraft((draft) => ({
          ...draft,
          statPool: next.pointPool,
          statCap: next.pointCapPerAbility,
        }));
      }
      return next;
    });
  }

  function toggleCampaignTag(tag: CampaignTagId, checked: boolean) {
    setCampaignConfiguration((current) => {
      const next = checked
        ? [...current.campaignTags, tag]
        : current.campaignTags.filter((entry) => entry !== tag);
      return { ...current, campaignTags: next };
    });
  }

  function toggleEquipmentValidationRule(rule: EquipmentValidationRuleId, checked: boolean) {
    setCharacterConfiguration((current) => ({
      ...current,
      equipmentValidationRules: {
        ...current.equipmentValidationRules,
        [rule]: checked,
      },
    }));
  }

  function goToStep(index: number) {
    if (index < 0 || index >= step) return;
    setError(null);
    setStep(index);
  }

  function back() {
    goToStep(step - 1);
  }

  function submit() {
    if (submitting) return;

    const current = CAMPAIGN_STEPS[step];
    if (!current) return;

    if (step < CAMPAIGN_STEPS.length - 1) {
      const result = validateCampaignStep(current.id, input, optionsDraft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setStep(step + 1);
      return;
    }

    const result = validateCampaignSettings(input, optionsDraft);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (!linked) {
      setError("Link an AI provider before you create a game.");
      return;
    }

    setSubmitting(true);
    setError(null);
    void finishCreate(result.value);
  }

  async function finishCreate(settings: CampaignSettings) {
    const hostAi = readHostAi();
    if (!hostAi) {
      setError("Link an AI provider before you create a game.");
      setSubmitting(false);
      return;
    }

    const situationResult = await generateOpeningSituation(settings, hostAi);
    if (!situationResult.ok) {
      setError(situationResult.error);
      setSubmitting(false);
      return;
    }

    try {
      const roomCode = createRoomCode();
      const table = createTable(roomCode, settings);
      table.situation = situationResult.situation;
      table.location = situationResult.location;
      table.journey = rememberJourney(table.journey, {
        scene: 1,
        place: situationResult.location.place,
        encounter: null,
        events: [],
      });
      table.revision = 1;
      writeHostSession({ roomCode, table });
      router.push(paths.room(roomCode));
    } catch {
      setSubmitting(false);
      setError("The game could not be stored in this browser.");
    }
  }

  const isCustomUniverse = universe === "custom";
  const presetCharacterOptions = universe && !isCustomUniverse ? characterOptionsFor(universe) : null;

  return {
    ready,
    linked,
    presetsStatus,
    step,
    campaignName,
    universe,
    universeLabel,
    universeType,
    objective,
    globalDifficulty,
    campaignConfiguration,
    characterConfiguration,
    optionsDraft,
    isCustomUniverse,
    presetCharacterOptions,
    error,
    submitting,
    setCampaignName: (value: string) => edit(() => setCampaignName(value)),
    selectUniverse,
    setUniverseLabel: (value: string) => edit(() => setUniverseLabel(value)),
    setUniverseType: (value: string) => edit(() => setUniverseType(value)),
    setObjective: (value: string) => edit(() => setObjective(value)),
    selectGlobalDifficulty: (difficulty: GlobalDifficultyId | "") =>
      edit(() => selectGlobalDifficulty(difficulty)),
    exportCampaignSettings: () => edit(() => exportCampaignSettings()),
    importCampaignSettings: (raw: unknown) => {
      const message = importCampaignSettings(raw);
      if (message) setError(message);
      return message;
    },
    patchConfiguration: (patch: Partial<CampaignConfigurationInput>) =>
      edit(() => patchConfiguration(patch)),
    patchCharacterConfiguration: (patch: Partial<CharacterConfigurationInput>) =>
      edit(() => patchCharacterConfiguration(patch)),
    toggleCampaignTag: (tag: CampaignTagId, checked: boolean) =>
      edit(() => toggleCampaignTag(tag, checked)),
    toggleEquipmentValidationRule: (rule: EquipmentValidationRuleId, checked: boolean) =>
      edit(() => toggleEquipmentValidationRule(rule, checked)),
    setOptionsDraft: (update: (current: CharacterOptionsDraft) => CharacterOptionsDraft) =>
      edit(() => setOptionsDraft(update)),
    nextOptionId,
    goToStep,
    back,
    submit,
  };
}
