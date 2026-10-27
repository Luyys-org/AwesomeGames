"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useHostAi } from "@/rpg/features/landing/use-host-ai";
import {
  CAMPAIGN_STEPS,
  type CampaignSettingsInput,
  universePreset,
  validateCampaignSettings,
  validateCampaignStep,
} from "@/rpg/lib/campaign-settings";
import {
  configEnemyDifficultyFromLegacy,
  configLootRarityFromLegacy,
  configPlayerFreedomFromLegacy,
  emptyCampaignConfigurationInput,
  type CampaignConfigurationInput,
  type CampaignTagId,
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

    try {
      const roomCode = createRoomCode();
      writeHostSession({
        roomCode,
        table: createTable(roomCode, result.value),
      });
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
