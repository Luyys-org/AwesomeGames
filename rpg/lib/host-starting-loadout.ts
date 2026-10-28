import {
  characterIdentity,
  readItemModifiers,
  readItemSlot,
  type StatDefinition,
} from "@/rpg/lib/character-options";
import type { HostAi } from "@/rpg/lib/host-ai";
import {
  buildStartingLoadoutRetryMessage,
  buildStartingLoadoutUserMessage,
  buildGmSystemPrompt,
  type StartingLoadoutCharacterPrompt,
} from "@/rpg/lib/host-gm-prompt";
import { callHostChat, parseJsonContent } from "@/rpg/lib/host-model-call";
import {
  currencyLabel,
  currencyRange,
  equipmentCountRange,
  type DraftInventoryItem,
  type DraftStartingKit,
} from "@/rpg/lib/starting-kit";
import { repairSceneActionEntries, validateSceneActions } from "@/rpg/lib/scene-action";
import { applyStartingLoadout, type SceneAction, type TableState } from "@/rpg/lib/table";

export async function generateStartingLoadout(
  table: TableState,
  hostAi: HostAi,
): Promise<
  { ok: true; kits: DraftStartingKit[]; actions: SceneAction[] } | { ok: false; error: string }
> {
  const prompt = loadoutPrompt(table);
  const first = await requestLoadout(hostAi, buildStartingLoadoutUserMessage(prompt), table);
  if (first.ok) return first;

  const second = await requestLoadout(
    hostAi,
    buildStartingLoadoutRetryMessage(prompt, first.error),
    table,
  );
  if (second.ok) return second;

  return { ok: false, error: "The starting loadout could not be generated." };
}

function loadoutPrompt(table: TableState): {
  settings: TableState["settings"];
  situation: string;
  place: string;
  currencyName: string;
  characters: StartingLoadoutCharacterPrompt[];
} {
  const wealth = table.settings.characterConfiguration?.startingWealth;
  const abundance = table.settings.campaignConfiguration?.currencyAbundance;
  const equipment = table.settings.characterConfiguration?.startingEquipment;
  const money = currencyRange(wealth, abundance);
  const gear = equipmentCountRange(equipment);
  const options = table.settings.characterOptions;

  return {
    settings: table.settings,
    situation: table.situation,
    place: table.location.place,
    currencyName: currencyLabel(table.settings.universe),
    characters: table.characters
      .filter((character) => !character.archived)
      .map((character) => {
        const identity = characterIdentity(character, options);
        return {
          characterId: character.id,
          name: character.name,
          classLabel: identity.className,
          raceLabel: identity.race,
          currencyMin: money.min,
          currencyMax: money.max,
          itemMin: gear.min,
          itemMax: gear.max,
        };
      }),
  };
}

async function requestLoadout(
  hostAi: HostAi,
  user: string,
  table: TableState,
): Promise<{ ok: true; kits: DraftStartingKit[]; actions: SceneAction[] } | { ok: false; error: string }> {
  const response = await callHostChat(hostAi, {
    temperature: 0.7,
    system: buildGmSystemPrompt(table.settings),
    user,
  });
  if (!response.ok) return response;

  const parsed = parseJsonContent(response.content);
  const loadout = readLoadout(parsed, table);
  if (!loadout.ok) return loadout;
  const applied = applyStartingLoadout(table, loadout.kits, loadout.actions);
  if (!applied.ok) return applied;
  return loadout;
}

function readLoadout(
  value: unknown,
  table: TableState,
): { ok: true; kits: DraftStartingKit[]; actions: SceneAction[] } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "Response JSON must be an object with kits and actions." };
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.kits)) return { ok: false, error: "Response JSON must include a kits array." };

  const livingIds = new Set(
    table.characters.filter((character) => !character.archived).map((character) => character.id),
  );
  const kits: DraftStartingKit[] = [];
  const seen = new Set<string>();
  for (const entry of record.kits) {
    const kit = readKit(entry, table.settings.characterOptions.stats);
    if (!kit) return { ok: false, error: "Each kit needs characterId, currency, and inventory." };
    if (!livingIds.has(kit.characterId) || seen.has(kit.characterId)) {
      return { ok: false, error: "Each living character must appear in kits exactly once." };
    }
    seen.add(kit.characterId);
    kits.push(kit);
  }
  if (kits.length !== livingIds.size) {
    return { ok: false, error: "Return one kit for each living character." };
  }

  const actions = validateSceneActions(repairSceneActionEntries(record.actions), table);
  if (!actions.ok) return actions;
  if (actions.value.length < 3 || actions.value.length > 8) {
    return { ok: false, error: "Return 3 to 8 actions." };
  }

  return { ok: true, kits, actions: actions.value };
}

function readKit(value: unknown, stats: StatDefinition[]): DraftStartingKit | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.characterId !== "string" || typeof record.currency !== "number") return null;
  if (!Array.isArray(record.inventory)) return null;
  const inventory: DraftInventoryItem[] = [];
  for (const item of record.inventory) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string") return null;
    const modifiers = readItemModifiers(row.modifiers, stats);
    if (!modifiers.ok) return null;
    const slot = readItemSlot(row.slot);
    if (!slot.ok) return null;
    inventory.push({
      name: row.name.trim(),
      slot: slot.value,
      equipped: row.equipped === true,
      modifiers: modifiers.value,
    });
  }
  return {
    characterId: record.characterId,
    currency: record.currency,
    inventory,
  };
}
