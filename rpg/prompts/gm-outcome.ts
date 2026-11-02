export default `
Each action lists the stat check players will compare before someone performs it. stat is a campaign stat id. difficulty is 8, 10, 12, or 15. failure is setback, harm, or severe. abilityId is a skill id when that skill alone fits the action, otherwise "". characterIds lists characterId values who may take the action when the fiction limits who can; use [] when any in-scene character may try. itemId is an inventory id from Characters when only whoever carries that item may take the action; otherwise "".

Limits:
{{json:limits}}

Campaign:
{{json:campaign}}

Scene {{scene}}
Opening situation (scene 1 only):
{{situation}}

Place: {{place}}
Weather: {{weather}}
Reputation: {{reputation}}
Currency name: {{currencyName}}
Injury system: {{injuryEnabled}}

Characters:
{{json:characters}}

Journey (places, people, and resolved events already lived):
{{json:journey}}

Recent memory:
{{json:memory}}

Campaign plan:
{{json:plan}}

{{planRules}}

latestNarration was already shown before the dice. Narration is the next thing players read. Open with the consequence of the resolved check. Do not retell or paraphrase that passage.

Player intent:
{{json:intent}}

Resolved check:
{{json:resolution}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Stake: {{stake}}
The consequence is success or failure of that stake only. A detail in the pre-roll narration that is not the stake does not change what happens.

Task: Narrate only the consequence of that resolved check. Players already read the situation, then the dice line. Do not restate the place, the attempt, or the stake. The first sentence is what changes because the check succeeded or failed: the door opens, the blow misses, the guard believes them. The resolution object is the result. Do not repeat its numbers, and do not contradict success, woundsApplied, or deathPenalty. Do not write a new die result or call another check. If woundsApplied is 0, do not say a wound box was marked. If a death penalty is set, narrate that consequence. Stay consistent with the journey. Do not contradict a recorded event. You may grant loot within the limits to living characters who are still in the scene, change place, weather, or reputation, and continue or end an encounter. Each character's situation is how they are placed or held. Allowed values: {{situationList}}. The situation on the character sheet is current. situations lists only characters whose situation changes because of this result. Omit a character, or return [], to keep theirs. Narration must match those situations. Do not free a tied-up character, open a cell, release a grapple, reveal someone hidden, or put someone on their feet unless situations says so. A character whose wounds include down stays unconscious. Next actions must be possible from the situation after this result. Each loot item needs slot, a lowercase slug such as head, chest, hands, or weapon, and a modifiers array using campaign stat ids, kind stat or roll, and amounts from −3 to −1 or 1 to 3. Only one equipped item can use the same slot. Use an empty slot only for items that do not occupy a wear slot. Use an empty modifiers array when the item has no mechanical effect. Empty place, weather, or reputation keeps the current line. Follow the campaign loot, injury, NPC, and freedom settings. Return 3 to 8 specific next actions that fit the moment after this result. Labels must name a concrete task, not vague Explore or Interact commands. Action ids use hyphens only, no underscores, and at most 32 characters each. Every action includes stat, difficulty (8, 10, 12, or 15), and failure. Use characterIds and itemId when only some characters can attempt an action. progress lists who earned experience from this result. xp is a whole number from 10 to 100. Pick it for how much this result earned: a small step near 10, a clear success in the middle, a real advance on the objective near 100. Vary the number. Do not scale for experience gain or character level. Use [] when the result earned nothing. Follow the campaign plan. A failed check leaves placeId as the current place or empty, sceneId as the current scene or empty, and clearedSceneId empty.
`.trim();
