"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type AiProvider,
  type HostAi,
  HOST_AI_STORAGE_KEY,
  clearHostAi,
  isAiProvider,
  readHostAi,
  writeHostAi,
} from "@/rpg/lib/host-ai";

export interface HostAiInput {
  provider: AiProvider;
  model: string;
  apiKey: string;
  imageModel?: string;
}

export function useHostAi() {
  const [hostAi, setHostAi] = useState<HostAi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHostAi(readHostAi());
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== HOST_AI_STORAGE_KEY) return;
      setHostAi(readHostAi());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback(
    (input: HostAiInput): string | null => {
      if (!isAiProvider(input.provider)) {
        return "Choose OpenAI, Anthropic, or Grok.";
      }

      const model = input.model.trim();
      const apiKey = input.apiKey.trim() || hostAi?.apiKey || "";
      if (!model) return "Enter a model name.";
      if (!apiKey) return "Enter an API key.";

      const imageModel = input.imageModel?.trim();
      const next: HostAi = {
        provider: input.provider,
        model,
        apiKey,
        ...(imageModel ? { imageModel } : {}),
      };

      try {
        writeHostAi(next);
      } catch {
        return "The provider could not be saved in this browser.";
      }

      setHostAi(next);
      return null;
    },
    [hostAi],
  );

  const remove = useCallback((): string | null => {
    try {
      clearHostAi();
    } catch {
      return "The provider could not be removed from this browser.";
    }

    setHostAi(null);
    return null;
  }, []);

  return {
    ready,
    linked: hostAi !== null,
    provider: hostAi?.provider ?? null,
    model: hostAi?.model ?? "",
    imageModel: hostAi?.imageModel ?? "",
    save,
    remove,
  };
}
