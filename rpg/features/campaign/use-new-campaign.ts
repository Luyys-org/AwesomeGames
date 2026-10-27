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
  playerCount: "",
  deathPenalty: "",
  enemyDifficulty: "",
  lootRarity: "",
  playerFreedom: "",
};

export function useNewCampaign() {
  const router = useRouter();
  const { ready, linked } = useHostAi();
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [universe, setUniverse] = useState("");
  const [universeLabel, setUniverseLabel] = useState("");
  const [universeType, setUniverseType] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [deathPenalty, setDeathPenalty] = useState("");
  const [objective, setObjective] = useState("");
  const [enemyDifficulty, setEnemyDifficulty] = useState("");
  const [lootRarity, setLootRarity] = useState("");
  const [playerFreedom, setPlayerFreedom] = useState("");
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
    playerCount,
    objective,
    deathPenalty,
    enemyDifficulty,
    lootRarity,
    playerFreedom,
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

  function selectUniverse(value: string) {
    setUniverse(value);
    clearResult();
    resetOptions();

    const preset = universePreset(value);
    if (!preset) {
      setUniverseLabel(EMPTY_PREFILL.universeLabel);
      setUniverseType(EMPTY_PREFILL.universeType);
      setPlayerCount(EMPTY_PREFILL.playerCount);
      setDeathPenalty(EMPTY_PREFILL.deathPenalty);
      setEnemyDifficulty(EMPTY_PREFILL.enemyDifficulty);
      setLootRarity(EMPTY_PREFILL.lootRarity);
      setPlayerFreedom(EMPTY_PREFILL.playerFreedom);
      return;
    }

    setUniverseLabel("");
    setUniverseType(preset.universeType);
    setPlayerCount(String(preset.playerCount));
    setDeathPenalty(preset.deathPenalty);
    setEnemyDifficulty(preset.enemyDifficulty);
    setLootRarity(preset.lootRarity);
    setPlayerFreedom(preset.playerFreedom);
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

  return {
    ready,
    linked,
    presetsStatus,
    step,
    campaignName,
    universe,
    universeLabel,
    universeType,
    playerCount,
    deathPenalty,
    objective,
    enemyDifficulty,
    lootRarity,
    playerFreedom,
    optionsDraft,
    error,
    submitting,
    setCampaignName: (value: string) => edit(() => setCampaignName(value)),
    selectUniverse,
    setUniverseLabel: (value: string) => edit(() => setUniverseLabel(value)),
    setUniverseType: (value: string) => edit(() => setUniverseType(value)),
    setPlayerCount: (value: string) => edit(() => setPlayerCount(value)),
    setDeathPenalty: (value: string) => edit(() => setDeathPenalty(value)),
    setObjective: (value: string) => edit(() => setObjective(value)),
    setEnemyDifficulty: (value: string) => edit(() => setEnemyDifficulty(value)),
    setLootRarity: (value: string) => edit(() => setLootRarity(value)),
    setPlayerFreedom: (value: string) => edit(() => setPlayerFreedom(value)),
    setOptionsDraft: (update: (current: CharacterOptionsDraft) => CharacterOptionsDraft) =>
      edit(() => setOptionsDraft(update)),
    nextOptionId,
    goToStep,
    back,
    submit,
  };
}
