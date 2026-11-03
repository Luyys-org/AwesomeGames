import { GROK_IMAGE_MODEL, type HostAi } from "@/rpg/lib/host-ai";

export function resolveImageModel(hostAi: HostAi): string {
  const trimmed = hostAi.imageModel?.trim();
  if (trimmed) return trimmed;
  return GROK_IMAGE_MODEL;
}

export async function callHostImage(
  hostAi: HostAi,
  prompt: string,
  aspectRatio = "16:9",
): Promise<{ ok: true; b64: string; mime: string } | { ok: false; error: string }> {
  const model = resolveImageModel(hostAi);

  try {
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
        aspect_ratio: aspectRatio,
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
