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

export type HostTextField = "narration" | "situation";

export interface HostTextDraft {
  start: () => void;
  text: (value: string) => void;
  flush: () => Promise<void>;
}

export interface SseAssembly {
  pending: string;
  deltas: string[];
  done: boolean;
}

export function consumeSseChunk(pending: string, chunk: string): SseAssembly {
  const combined = pending + chunk;
  const lines = combined.split(/\r?\n/);
  const rest = lines.pop() ?? "";
  const deltas: string[] = [];
  let done = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    const delta = readDeltaContent(data);
    if (delta) deltas.push(delta);
  }
  return { pending: done ? "" : rest, deltas, done };
}

export function readStreamingStringField(body: string, field: string): string | null {
  const key = `"${field}"`;
  let searchFrom = 0;
  while (searchFrom < body.length) {
    const at = body.indexOf(key, searchFrom);
    if (at < 0) return null;
    if (!isJsonKey(body, at)) {
      searchFrom = at + key.length;
      continue;
    }
    let index = at + key.length;
    index = skipWhitespace(body, index);
    if (index >= body.length || body[index] !== ":") {
      if (index >= body.length) return null;
      searchFrom = at + key.length;
      continue;
    }
    index = skipWhitespace(body, index + 1);
    if (index >= body.length) return null;
    if (body[index] !== '"') {
      searchFrom = at + key.length;
      continue;
    }
    return decodeJsonString(body, index + 1);
  }
  return null;
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
    textField?: HostTextField;
    onText?: (partial: string) => void;
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
        stream: true,
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
    if (!response.ok) {
      const payload = await readJsonBody(response);
      return { ok: false, error: readProviderError(payload) ?? "The model request failed." };
    }
    let shown: string | null = null;
    const content = await readStreamedContent(response, (partial) => {
      if (!options.textField || !options.onText) return;
      const text = readStreamingStringField(partial, options.textField);
      if (text === null || text === shown) return;
      shown = text;
      options.onText(text);
    });
    if (!content) return { ok: false, error: "The model returned an empty response." };
    return { ok: true, content };
  } catch {
    return { ok: false, error: "The model could not be reached." };
  }
}

export async function callHostProse(
  hostAi: HostAi,
  options: {
    role: HostChatRole;
    temperature: number;
    system: string;
    user: string;
    maxTokens?: number;
    responseSchema: HostResponseSchema;
    textField: HostTextField;
  },
  draft?: HostTextDraft,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  draft?.start();
  try {
    return await callHostChat(hostAi, {
      ...options,
      onText: (value) => draft?.text(value),
    });
  } finally {
    if (draft) await draft.flush();
  }
}

async function readStreamedContent(response: Response, onContent: (content: string) => void): Promise<string> {
  if (!response.body) throw new Error("The model returned no stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let content = "";

  const absorb = (piece: string): boolean => {
    if (piece.length === 0) return false;
    const assembled = consumeSseChunk(pending, piece);
    pending = assembled.pending;
    if (assembled.deltas.length > 0) {
      content += assembled.deltas.join("");
      onContent(content);
    }
    return assembled.done;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && absorb(decoder.decode(value, { stream: true }))) return content;
    }
    if (absorb(decoder.decode())) return content;
    if (pending.trim().length > 0) absorb(pending.endsWith("\n") ? "" : "\n");
    return content;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function isJsonKey(body: string, at: number): boolean {
  let before = at - 1;
  while (before >= 0 && isWhitespace(body[before]!)) before -= 1;
  if (before < 0) return false;
  const previous = body[before];
  return previous === "{" || previous === ",";
}

function skipWhitespace(body: string, index: number): number {
  let cursor = index;
  while (cursor < body.length && isWhitespace(body[cursor]!)) cursor += 1;
  return cursor;
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\n" || char === "\r" || char === "\t";
}

function decodeJsonString(body: string, start: number): string {
  let text = "";
  for (let index = start; index < body.length; index += 1) {
    const char = body[index]!;
    if (char === '"') return text;
    if (char !== "\\") {
      text += char;
      continue;
    }
    if (index + 1 >= body.length) return text;
    const escaped = body[index + 1]!;
    if (escaped === "u") {
      if (index + 6 > body.length) return text;
      const hex = body.slice(index + 2, index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return text;
      text += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }
    const mapped = JSON_ESCAPES[escaped];
    if (mapped === undefined) return text;
    text += mapped;
    index += 1;
  }
  return text;
}

const JSON_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

function readDeltaContent(data: string): string | null {
  try {
    const payload = JSON.parse(data) as unknown;
    if (!isRecord(payload) || !Array.isArray(payload.choices) || payload.choices.length === 0) return null;
    const choice = payload.choices[0];
    if (!isRecord(choice) || !isRecord(choice.delta)) return null;
    return typeof choice.delta.content === "string" && choice.delta.content.length > 0
      ? choice.delta.content
      : null;
  } catch {
    return null;
  }
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProviderError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string") return payload.error;
  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return null;
}
