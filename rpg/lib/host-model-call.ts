import type { HostAi } from "@/rpg/lib/host-ai";

export function truncateText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

export function stripMarkdownFence(body: string): string {
  let text = body.trim();
  if (!text.startsWith("```")) return text;
  const lines = text.split("\n");
  lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "```") {
    lines.pop();
  }
  return lines.join("\n").trim();
}

export function parseJsonContent(body: string): unknown | null {
  const stripped = stripMarkdownFence(body);
  if (stripped.length === 0) return null;
  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    return null;
  }
}

export async function callHostChat(
  hostAi: HostAi,
  options: { temperature: number; system: string; user: string },
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    if (hostAi.provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": hostAi.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: hostAi.model,
          max_tokens: 2048,
          temperature: options.temperature,
          system: options.system,
          messages: [{ role: "user", content: options.user }],
        }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        return { ok: false, error: readProviderError(payload) ?? "The model request failed." };
      }
      const content = readAnthropicText(payload);
      if (!content) return { ok: false, error: "The model returned an empty response." };
      return { ok: true, content };
    }

    const url =
      hostAi.provider === "grok"
        ? "https://api.x.ai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostAi.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: hostAi.model,
        temperature: options.temperature,
        max_tokens: 2048,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      return { ok: false, error: readProviderError(payload) ?? "The model request failed." };
    }
    const content = readOpenAiText(payload);
    if (!content) return { ok: false, error: "The model returned an empty response." };
    return { ok: true, content };
  } catch {
    return { ok: false, error: "The model could not be reached." };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOpenAiText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices) || payload.choices.length === 0) {
    return null;
  }
  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  if (typeof choice.message.content !== "string") return null;
  return choice.message.content;
}

function readAnthropicText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.content)) return null;
  const parts: string[] = [];
  for (const block of payload.content) {
    if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  const joined = parts.join("");
  return joined.length > 0 ? joined : null;
}

function readProviderError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string") return payload.error;
  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return null;
}
