"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readHostAi } from "@/rpg/lib/host-ai";
import { checkProviderHealth } from "@/rpg/lib/provider-health";

export type ProviderHealthStatus = "idle" | "checking" | "reachable" | "unreachable";

export function useProviderHealth(linked: boolean) {
  const [status, setStatus] = useState<ProviderHealthStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current += 1;
    setStatus("idle");
    setDetail(null);
  }, []);

  useEffect(() => {
    if (!linked) reset();
  }, [linked, reset]);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const check = useCallback(async () => {
    const id = ++requestId.current;
    setStatus("checking");
    setDetail(null);

    const saved = readHostAi();
    const result = saved
      ? await checkProviderHealth(saved)
      : { ok: false, detail: "The provider could not be reached." };

    if (requestId.current !== id) return;
    setStatus(result.ok ? "reachable" : "unreachable");
    setDetail(result.detail);
  }, []);

  return { status, detail, check, reset };
}
