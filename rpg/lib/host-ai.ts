export const HOST_AI_STORAGE_KEY = "rpg.host.ai";

export type AiProvider = "openai" | "anthropic";

export interface HostAi {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "openai" || value === "anthropic";
}

export function parseHostAi(value: unknown): HostAi | null {
  if (!isRecord(value) || !isAiProvider(value.provider)) return null;
  if (typeof value.model !== "string" || value.model.trim() === "") return null;
  if (typeof value.apiKey !== "string" || value.apiKey.trim() === "") return null;

  return {
    provider: value.provider,
    model: value.model.trim(),
    apiKey: value.apiKey.trim(),
  };
}

export function readHostAi(): HostAi | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(HOST_AI_STORAGE_KEY);
    if (!raw) return null;
    return parseHostAi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeHostAi(hostAi: HostAi): void {
  const stored: HostAi = {
    provider: hostAi.provider,
    model: hostAi.model,
    apiKey: hostAi.apiKey,
  };
  window.localStorage.setItem(HOST_AI_STORAGE_KEY, JSON.stringify(stored));
}

export function clearHostAi(): void {
  window.localStorage.removeItem(HOST_AI_STORAGE_KEY);
}

export function providerLabel(provider: AiProvider): string {
  return AI_PROVIDERS.find((entry) => entry.id === provider)?.label ?? provider;
}
