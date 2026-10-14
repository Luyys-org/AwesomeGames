import type { GameCommandRequest, GameCommandType } from "@/leaders/services/game.types";

import { IllegalGameMoveException } from "@/leaders/domain/errors";

export type AbilityParamValue = string | number | boolean;

export interface ResolvedCommand {
  type: GameCommandType;
  pieceId?: string;
  targetCellId?: number;
  offerIndex?: number;
  abilityParams: Record<string, AbilityParamValue>;
}

const COMMAND_TYPES = new Set<GameCommandType>([
  "DEFAULT_MOVE",
  "ACTIVE_ABILITY",
  "END_ACTION_PHASE",
  "RECRUIT",
]);

export function resolveCommand(command: GameCommandRequest): ResolvedCommand {
  if (command.actionKey !== undefined) {
    if (command.actionKey.trim() === "") {
      throw new IllegalGameMoveException("actionKey is required");
    }
    return decodeActionKey(command.actionKey);
  }

  if (!command.type) {
    throw new IllegalGameMoveException("type or actionKey is required");
  }

  return {
    type: command.type,
    pieceId: command.pieceId,
    targetCellId: command.targetCellId,
    offerIndex: command.offerIndex,
    abilityParams: normalizeParams(command.abilityParams),
  };
}

export function encodeActionKey(command: ResolvedCommand): string {
  const parts = ["v1", command.type];
  if (command.pieceId) {
    parts.push(command.pieceId);
  }
  if (command.targetCellId != null) {
    parts.push(`c=${command.targetCellId}`);
  }
  if (command.offerIndex != null) {
    parts.push(`o=${command.offerIndex}`);
  }

  const keys = Object.keys(command.abilityParams).sort();
  if (keys.length > 0) {
    const body = keys.map((key) => `${key}:${String(command.abilityParams[key])}`).join(",");
    parts.push(`p=${body}`);
  }

  return base64UrlEncode(parts.join("|"));
}

export function decodeActionKey(key: string): ResolvedCommand {
  if (!key || key.trim() === "") {
    throw new IllegalGameMoveException("actionKey is required");
  }

  let text: string;
  try {
    text = base64UrlDecode(key.trim());
  } catch {
    throw new IllegalGameMoveException("Invalid actionKey");
  }

  const parts = text.split("|");
  if (parts[0] !== "v1" || !COMMAND_TYPES.has(parts[1] as GameCommandType)) {
    throw new IllegalGameMoveException("Invalid actionKey");
  }

  const type = parts[1] as GameCommandType;
  let pieceId: string | undefined;
  let targetCellId: number | undefined;
  let offerIndex: number | undefined;
  const abilityParams: Record<string, AbilityParamValue> = {};

  for (let index = 2; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.startsWith("c=")) {
      targetCellId = Number(part.slice(2));
    } else if (part.startsWith("o=")) {
      offerIndex = Number(part.slice(2));
    } else if (part.startsWith("p=")) {
      const body = part.slice(2);
      if (body.length === 0) {
        continue;
      }
      for (const pair of body.split(",")) {
        const colon = pair.indexOf(":");
        if (colon <= 0) {
          continue;
        }
        abilityParams[pair.slice(0, colon)] = coerceParam(pair.slice(colon + 1));
      }
    } else if (part.length > 0) {
      pieceId = part;
    }
  }

  return { type, pieceId, targetCellId, offerIndex, abilityParams };
}

export function normalizeParams(
  params: Record<string, unknown> | null | undefined,
): Record<string, AbilityParamValue> {
  if (!params) {
    return {};
  }

  const result: Record<string, AbilityParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
    }
  }
  return result;
}

function coerceParam(value: string): AbilityParamValue {
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padding = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + padding;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
