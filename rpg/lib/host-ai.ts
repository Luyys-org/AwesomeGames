export const HOST_AI_STORAGE_KEY = "rpg.host.ai";

export const GROK_PLAN_MODEL = "grok-4.7";
export const GROK_GM_MODEL = "grok-4.20-non-reasoning";
export const GROK_IMAGE_MODEL = "grok-imagine-image-2.0";

export type HostChatRole = "plan" | "gm";

export function hostChatModel(role: HostChatRole): string {
  return role === "plan" ? GROK_PLAN_MODEL : GROK_GM_MODEL;
}

export interface HostAi {
  model: string;
  apiKey: string;
  imageModel?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHostAi(value: unknown): HostAi | null {
  if (!isRecord(value)) return null;
  if ("provider" in value && value.provider !== "grok") return null;
  if (typeof value.model !== "string" || value.model.trim() === "") return null;
  if (typeof value.apiKey !== "string" || value.apiKey.trim() === "") return null;

  const imageModel =
    typeof value.imageModel === "string" && value.imageModel.trim().length > 0
      ? value.imageModel.trim()
      : undefined;

  return {
    model: value.model.trim(),
    apiKey: value.apiKey.trim(),
    ...(imageModel ? { imageModel } : {}),
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
    model: hostAi.model,
    apiKey: hostAi.apiKey,
    ...(hostAi.imageModel?.trim() ? { imageModel: hostAi.imageModel.trim() } : {}),
  };
  window.localStorage.setItem(HOST_AI_STORAGE_KEY, JSON.stringify(stored));
}

export function clearHostAi(): void {
  window.localStorage.removeItem(HOST_AI_STORAGE_KEY);
}
