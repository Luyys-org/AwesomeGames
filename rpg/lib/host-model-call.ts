import { hostChatModel, type HostAi, type HostChatRole } from "@/rpg/lib/host-ai";

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

export interface HostResponseSchema {
  name: string;
  schema: Record<string, unknown>;
}

export async function callHostChat(
  hostAi: HostAi,
  options: {
    role: HostChatRole;
    temperature: number;
    system: string;
    user: string;
    maxTokens?: number;
    responseSchema: HostResponseSchema;
  },
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const maxTokens = options.maxTokens ?? 2048;
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostAi.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: hostChatModel(options.role),
        temperature: options.temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: options.responseSchema.name,
            strict: true,
            schema: options.responseSchema.schema,
          },
        },
      }),
    });
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      return { ok: false, error: readProviderError(payload) ?? "The model request failed." };
    }
    const content = readChatText(payload);
    if (!content) return { ok: false, error: "The model returned an empty response." };
    return { ok: true, content };
  } catch {
    return { ok: false, error: "The model could not be reached." };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readChatText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices) || payload.choices.length === 0) {
    return null;
  }
  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  if (typeof choice.message.content !== "string") return null;
  return choice.message.content;
}

function readProviderError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string") return payload.error;
  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return null;
}
