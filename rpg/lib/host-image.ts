import type { AiProvider, HostAi } from "@/rpg/lib/host-ai";

const DEFAULT_IMAGE_MODEL: Record<Exclude<AiProvider, "anthropic">, string> = {
  openai: "gpt-image-1",
  grok: "grok-imagine-image-2.0",
};

export function resolveImageModel(hostAi: HostAi): string | null {
  if (hostAi.provider === "anthropic") return null;
  const trimmed = hostAi.imageModel?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_IMAGE_MODEL[hostAi.provider];
}

export async function callHostImage(
  hostAi: HostAi,
  prompt: string,
): Promise<{ ok: true; b64: string; mime: string } | { ok: false; error: string }> {
  const model = resolveImageModel(hostAi);
  if (!model) return { ok: false, error: "This provider does not support scene images." };

  try {
    if (hostAi.provider === "grok") {
      const response = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostAi.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          aspect_ratio: "16:9",
          response_format: "b64_json",
        }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        return { ok: false, error: readProviderError(payload) ?? "The image request failed." };
      }
      const b64 = readB64(payload);
      if (!b64) return { ok: false, error: "The image response was empty." };
      return { ok: true, b64, mime: "image/png" };
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostAi.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1536x1024",
        response_format: "b64_json",
      }),
    });
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      return { ok: false, error: readProviderError(payload) ?? "The image request failed." };
    }
    const b64 = readB64(payload);
    if (!b64) return { ok: false, error: "The image response was empty." };
    return { ok: true, b64, mime: "image/png" };
  } catch {
    return { ok: false, error: "The image service could not be reached." };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readB64(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.data) || payload.data.length === 0) return null;
  const first = payload.data[0];
  if (!isRecord(first) || typeof first.b64_json !== "string") return null;
  return first.b64_json.length > 0 ? first.b64_json : null;
}

function readProviderError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string") return payload.error;
  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return null;
}
