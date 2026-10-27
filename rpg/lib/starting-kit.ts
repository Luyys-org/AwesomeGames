import type { SettingLevel } from "@/rpg/lib/campaign-tab-config";
import type { UniverseId } from "@/rpg/lib/campaign-settings";
import type { InventoryItem } from "@/rpg/lib/character";

const STARTING_CURRENCY: Record<SettingLevel, number> = {
  low: 15,
  standard: 50,
  high: 150,
};

export function startingCurrency(wealth: SettingLevel | undefined): number {
  if (!wealth) return 0;
  return STARTING_CURRENCY[wealth];
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
