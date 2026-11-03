"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type HostAi,
  GROK_PLAN_MODEL,
  HOST_AI_STORAGE_KEY,
  clearHostAi,
  readHostAi,
  writeHostAi,
} from "@/rpg/lib/host-ai";

export interface HostAiInput {
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
      const apiKey = input.apiKey.trim() || hostAi?.apiKey || "";
      if (!apiKey) return "Enter an API key.";

      const imageModel = input.imageModel?.trim();
      const next: HostAi = {
        model: GROK_PLAN_MODEL,
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
    imageModel: hostAi?.imageModel ?? "",
    save,
    remove,
  };
}
