import {
  currentPlanNodes,
  offeredPlanActions,
  type CampaignPlan,
  type PlanAction,
  type PlanEncounter,
  type PlanLootItem,
  type PlanSceneReward,
} from "@/rpg/lib/campaign-plan";
import { grantProgressAndLoot, inflictWounds, type GmLootGrant } from "@/rpg/lib/gm-turn";
import { emptyJourney, rememberJourney } from "@/rpg/lib/journey";
import type { SceneAction, TableState, TranscriptEntry } from "@/rpg/lib/table";

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function planActionToSceneAction(action: PlanAction): SceneAction {
  return {
    id: action.id,
    label: action.label,
    stat: action.stat,
    difficulty: action.difficulty,
    failure: action.failure,
    ...(action.abilityId ? { abilityId: action.abilityId } : {}),
  };
}

export function installCurrentRoom(table: TableState): TableState {
  const plan = table.campaignPlan;
  if (!plan?.scripted) return table;
  const nodes = currentPlanNodes(plan);
  if (!nodes) return table;
  return {
    ...table,
    situation: nodes.place.narration,
    location: { ...table.location, place: nodes.place.name },
    availableActions: offeredPlanActions(plan).map(planActionToSceneAction),
  };
}

export function resolveScriptedAction(
  table: TableState,
  actionId: string,
  characterId: string,
  success: boolean,
): { ok: true; table: TableState; facts: string } | { ok: false; error: string } {
  const source = table.campaignPlan;
  if (!source?.scripted) return { ok: false, error: "This campaign has no script." };
  const nodes = currentPlanNodes(source);
  if (!nodes) return { ok: false, error: "The campaign plan has no current place." };
  const action = nodes.place.actions.find((entry) => entry.id === actionId);
  if (!action) return { ok: false, error: "That action is not in this room." };
  if (!offeredPlanActions(source).some((entry) => entry.id === action.id)) {
    return { ok: false, error: "That action is not available." };
  }

  const plan = structuredClone(source);
  const here = currentPlanNodes(plan);
  if (!here) return { ok: false, error: "The campaign plan has no current place." };
  const scripted = here.place.actions.find((entry) => entry.id === actionId);
  if (!scripted) return { ok: false, error: "That action is not in this room." };

  let characters = table.characters;
  let notes: TranscriptEntry[] = [];
  let objectiveStatus = table.objectiveStatus;
  let nextPlan = plan;
  const facts = [success ? scripted.success : scripted.miss];

  if (!success) {
    if (scripted.effect === "encounter") {
      const encounter = here.place.encounters.find((entry) => entry.id === scripted.encounterId);
      if (!encounter) return { ok: false, error: "That encounter is not in this room." };
      facts.push(encounter.malus.consequence);
      const wounded = inflictWounds({ ...table, characters }, characterId, encounter.malus.wounds);
      if (!wounded.ok) return wounded;
      characters = wounded.characters;
      notes = wounded.notes;
    }
    if (scripted.effect === "clear-scene") facts.push(here.scene.failure);
  } else if (scripted.effect === "next-place") {
    const moved = stepPlan(plan);
    if (!moved.ok) return moved;
    nextPlan = moved.value;
    const destination = currentPlanNodes(nextPlan);
    if (destination) facts.push(destination.place.narration);
  } else if (scripted.effect === "clear-scene") {
    if (here.place.next !== "") return { ok: false, error: "Clear a scene objective only from its last place." };
    if (here.scene.objectiveStatus === "cleared") {
      return { ok: false, error: "That scene objective is already cleared." };
    }
    here.scene.objectiveStatus = "cleared";
    facts.push(here.scene.success);
    const granted = grantRewards(table, characters, characterId, here.scene.rewards, null);
    if (!granted.ok) return granted;
    characters = granted.characters;
    notes = granted.notes;
    if (here.scene.next === "") objectiveStatus = "complete";
  } else if (scripted.effect === "encounter") {
    const encounter = here.place.encounters.find((entry) => entry.id === scripted.encounterId);
    if (!encounter) return { ok: false, error: "That encounter is not in this room." };
    encounter.resolved = true;
    facts.push(`${encounter.name} is defeated.`);
    const granted = grantRewards(table, characters, characterId, [], encounter);
    if (!granted.ok) return granted;
    characters = granted.characters;
    notes = granted.notes;
  }

  const movedPlace = currentPlanNodes(nextPlan)?.place.name ?? table.location.place;
  const installed = installCurrentRoom({
    ...table,
    characters,
    objectiveStatus,
    campaignPlan: nextPlan,
    transcript: [...table.transcript, ...notes],
    journey: rememberJourney(table.journey ?? emptyJourney(), {
      scene: table.scene,
      place: movedPlace,
      encounter:
        scripted.effect === "encounter"
          ? encounterNote(here.place.encounters.find((entry) => entry.id === scripted.encounterId))
          : null,
      events: [facts.join(" ")],
    }),
    revision: table.revision + 1,
  });
  return { ok: true, table: installed, facts: facts.join(" ") };
}

function stepPlan(plan: CampaignPlan): Parsed<CampaignPlan> {
  const nodes = currentPlanNodes(plan);
  if (!nodes) return { ok: false, error: "The campaign plan has no current place." };
  const { scene, place } = nodes;
  if (place.next !== "") {
    const next = scene.places.find((entry) => entry.id === place.next);
    if (!next) return { ok: false, error: "The next place is not in this scene." };
    return { ok: true, value: { ...plan, currentPlaceId: next.id } };
  }
  if (scene.objectiveStatus !== "cleared") {
    return { ok: false, error: "Do not enter the next scene until this scene's objective is cleared." };
  }
  if (scene.next === "") return { ok: false, error: "That way is not open." };
  const nextScene = plan.scenes.find((entry) => entry.id === scene.next);
  const head = nextScene?.places[0];
  if (!nextScene || !head) return { ok: false, error: "The next scene has no place." };
  return { ok: true, value: { ...plan, currentSceneId: nextScene.id, currentPlaceId: head.id } };
}

function grantRewards(
  table: TableState,
  characters: TableState["characters"],
  actorId: string,
  rewards: PlanSceneReward[],
  encounter: PlanEncounter | null,
): { ok: true; characters: TableState["characters"]; notes: TranscriptEntry[] } | { ok: false; error: string } {
  const living = new Set(
    characters.filter((character) => !character.archived && character.inScene).map((character) => character.id),
  );
  const loot: GmLootGrant[] = [];
  const progress: { characterId: string; xp: number }[] = [];
  if (encounter && living.has(actorId)) {
    progress.push({ characterId: actorId, xp: encounter.defeat.xp });
    const grant = lootGrant(actorId, encounter.defeat.currency, encounter.defeat.items);
    if (grant) loot.push(grant);
  }
  for (const reward of rewards) {
    if (!living.has(reward.characterId)) continue;
    progress.push({ characterId: reward.characterId, xp: reward.xp });
    const grant = lootGrant(reward.characterId, reward.currency, reward.items);
    if (grant) loot.push(grant);
  }
  if (loot.length === 0 && progress.length === 0) return { ok: true, characters, notes: [] };
  const granted = grantProgressAndLoot({ ...table, characters }, loot, progress);
  if (!granted.ok) return granted;
  return { ok: true, characters: granted.characters, notes: granted.notes };
}

function lootGrant(characterId: string, currency: number, items: PlanLootItem[]): GmLootGrant | null {
  if (currency === 0 && items.length === 0) return null;
  return {
    characterId,
    currency,
    items: items.map((item) => ({
      name: item.name,
      slot: item.slot,
      equipped: item.equipped,
      modifiers: item.modifiers,
    })),
  };
}

function encounterNote(encounter: PlanEncounter | undefined): { name: string; summary: string } | null {
  if (!encounter) return null;
  return { name: encounter.name, summary: encounter.summary };
}
