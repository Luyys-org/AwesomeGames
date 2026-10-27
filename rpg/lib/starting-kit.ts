import type { UniverseId } from "@/rpg/lib/campaign-settings";
import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import type { InventoryItem } from "@/rpg/lib/character";
import type { ItemModifier } from "@/rpg/lib/character-options";

export interface AmountRange {
  min: number;
  max: number;
}

export interface DraftInventoryItem {
  name: string;
  slot: string;
  equipped: boolean;
  modifiers: ItemModifier[];
}

export interface DraftStartingKit {
  characterId: string;
  currency: number;
  inventory: DraftInventoryItem[];
}

const WEALTH_BASE: Record<SettingLevel, AmountRange> = {
  low: { min: 8, max: 24 },
  standard: { min: 30, max: 70 },
  high: { min: 90, max: 180 },
};

const ABUNDANCE_FACTOR: Record<SettingLevel, number> = {
  low: 0.6,
  standard: 1,
  high: 1.6,
};

const EQUIPMENT_COUNT: Record<SettingLevel, AmountRange> = {
  low: { min: 1, max: 2 },
  standard: { min: 2, max: 4 },
  high: { min: 3, max: 6 },
};

export function currencyRange(
  wealth: SettingLevel | undefined,
  abundance: SettingLevel | undefined,
): AmountRange {
  const base = WEALTH_BASE[wealth ?? "standard"];
  const factor = ABUNDANCE_FACTOR[abundance ?? "standard"];
  const min = Math.max(0, Math.round(base.min * factor));
  const max = Math.max(min, Math.round(base.max * factor));
  return { min, max };
}

export function equipmentCountRange(level: SettingLevel | undefined): AmountRange {
  return EQUIPMENT_COUNT[level ?? "standard"];
}

export function emptyInventory(): InventoryItem[] {
  return [];
}

export function currencyLabel(universe: UniverseId): string {
  if (universe === "dungeons-and-dragons") return "gp";
  if (universe === "star-wars") return "credits";
  if (universe === "alien") return "credits";
  return "coin";
}
