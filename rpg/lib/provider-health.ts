import { type HostAi } from "@/rpg/lib/host-ai";

const PROBE_TIMEOUT_MS = 20_000;
const DETAIL_MAX = 180;

export interface ProviderHealthResult {
  ok: boolean;
  detail: string;
}

interface ProbeRequest {
  url: string;
  headers: HeadersInit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function probeRequest(hostAi: HostAi): ProbeRequest {
  const model = encodeURIComponent(hostAi.model);

  if (hostAi.provider === "anthropic") {
    return {
      url: `https://api.anthropic.com/v1/models/${model}`,
      headers: {
        "x-api-key": hostAi.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    };
  }

  return {
    url:
      hostAi.provider === "openai"
        ? `https://api.openai.com/v1/models/${model}`
        : `https://api.x.ai/v1/models/${model}`,
    headers: {
      authorization: `Bearer ${hostAi.apiKey}`,
    },
  };
}

function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string" && payload.error.trim() !== "") return payload.error.trim();
  if (!isRecord(payload.error) || typeof payload.error.message !== "string") return null;
  const message = payload.error.message.trim();
  return message === "" ? null : message;
}

function presentDetail(message: string, apiKey: string): string {
  const cleaned = message.split(apiKey).join("").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned === "") return "The provider could not be reached.";
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return sentence.length > DETAIL_MAX ? sentence.slice(0, DETAIL_MAX).trim() : sentence;
}

function failureDetail(status: number, payload: unknown, apiKey: string): string {
  const message = readErrorMessage(payload);
  const normalized = message?.toLowerCase() ?? "";

  if (
    status === 401 ||
    status === 403 ||
    normalized.includes("api key") ||
    normalized.includes("api-key") ||
    normalized.includes("authentication") ||
    normalized.includes("unauthorized")
  ) {
    return "The API key was rejected.";
  }

  if (status === 404) return "The model was not found.";

  if (message) return presentDetail(message, apiKey);
  return "The provider could not be reached.";
}

export async function checkProviderHealth(hostAi: HostAi): Promise<ProviderHealthResult> {
  const request = probeRequest(hostAi);

  try {
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const raw = await response.text();
    let payload: unknown = null;
    if (raw.trim() !== "") {
      try {
        payload = JSON.parse(raw) as unknown;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      return { ok: false, detail: failureDetail(response.status, payload, hostAi.apiKey) };
    }

    if (raw.trim() === "") {
      return { ok: false, detail: "The provider returned an empty response." };
    }

    return { ok: true, detail: "Reachable" };
  } catch {
    return { ok: false, detail: "The provider did not respond." };
  }
}
