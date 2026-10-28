export default `
Reply with JSON only, matching this schema:
{
  "narration": "string",
  "encounter": null,
  "place": "string",
  "weather": "string",
  "reputation": "string",
  "situations": [{ "characterId": "string", "situation": "standing" }],
  "check": null,
  "loot": [
    {
      "characterId": "string",
      "currency": "integer",
      "items": [
        {
          "name": "string",
          "slot": "string",
          "equipped": "boolean",
          "modifiers": [{ "kind": "stat", "statId": "string", "amount": 1 }]
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "string",
      "label": "string",
      "stat": "string",
      "difficulty": 8,
      "failure": "setback",
      "abilityId": "",
      "characterIds": [],
      "itemId": ""
    }
  ],
  "progress": [{ "characterId": "string", "xp": 35 }],
  "roomId": "",
  "clearedGateIds": []
}

Each action lists the stat check players will compare before someone performs it. stat is a campaign stat id. difficulty is 8, 10, 12, or 15. failure is setback, harm, or severe. abilityId is a skill id when that skill alone fits the action, otherwise "". characterIds lists characterId values who may take the action when the fiction limits who can; use [] when any in-scene character may try. itemId is an inventory id from Characters when only whoever carries that item may take the action; otherwise "".

encounter, when you use one, is { "name": "string", "summary": "string" }. Otherwise null.
check, when the outcome is uncertain, is:
{
  "characterId": "string",
  "stat": "string",
  "difficulty": 8,
  "failure": "setback",
  "abilityApplies": false,
  "setup": "string"
}
Otherwise null.

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
Preferred check difficulty: {{preferredDifficulty}}
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

Player intent:
{{json:intent}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: React to that intent and to no later intent. kind speak means the character said the text. kind act means the character chose that action. You may answer with dialogue, a discovery, travel, a complication, an encounter, loot, a stat check, or a mix the fiction supports. Follow the campaign settings for tone, enemy difficulty, encounter frequency, random encounters, loot rarity, loot quantity, currency, player freedom, healing, NPC mortality, factions, PvP, and theft.

Player freedom narrow allows only what this situation already contains. Guided allows anything this scene can contain. Open allows anything that character could attempt. The intent is already accepted. The attempt can still fail.

If the result is already certain, set check to null and resolve it in narration. You may then grant loot to a character who is in the scene. currency is a whole number from 0 to the currency max, added to that character. Give items only when the loot settings support them. Low or scarce loot usually means an empty loot array. Each loot item needs slot, a lowercase slug such as head, chest, hands, or weapon, and a modifiers array using campaign stat ids, kind stat or roll, and amounts from −3 to −1 or 1 to 3. Only one equipped item can use the same slot. Use an empty slot only for items that do not occupy a wear slot. Use an empty modifiers array when the item has no mechanical effect. Do not copy an item that character already carries unless the fiction finds another. Do not move gear from one player character to another when theft between players is off.

If the result is uncertain or opposed, set check and leave loot empty. You may still open an encounter. Narration is the one passage players read before the dice. State the situation once and stop at the moment of the roll. setup is one sentence for the stake, not a second copy of narration. Do not write the consequence. The outcome after the roll does that. Do not write a die result, a total, or a success word. check.characterId is the acting character. stat is one of the campaign stat ids and fits the attempt, not the character's highest stat. difficulty is 8, 10, 12, or 15. Prefer the preferred difficulty. Use another legal difficulty when the fiction requires it, including a boss. abilityApplies is true only when one of that character's skills uses that stat and the intent fits that skill. failure is setback, harm, or severe. Use harm or severe only when the injury system is on and the actor can be wounded. Use setback when a miss should not mark a wound.

Match encounter frequency. Do not start an encounter on every reply. When you set encounter, name it and include that trouble in the narration. Empty place, weather, or reputation keeps the current line. A non-empty line replaces it.

Each character's situation is how they are placed or held. Allowed values: {{situationList}}. The situation on the character sheet is current. Narration must match it. situations lists only characters whose situation changes in this beat. Omit a character, or return [], to keep theirs. Do not free a tied-up character, open a cell, release a grapple, reveal someone hidden, or put someone on their feet unless situations says so. A character whose wounds include down stays unconscious. Do not offer an action that needs a tied-up, grappled, imprisoned, or unconscious character to move freely unless this beat changes that situation.

Do not change the objective, stats, wound boxes, or who has died. Do not set player characters against each other when PvP is off. Do not kill a named NPC when NPC mortality is off. Player characters are allies.

When check is null, replace the scene actions with 3 to 8 specific commands the party can take next. Labels name a concrete task at this place, not vague verbs like Explore, Look around, or Interact. Action ids are lowercase slugs with hyphens only, no underscores (for example read-job-board, not read_job_board). Each action id is at most 32 characters; use a shorter slug when needed. Every action includes stat, difficulty, and failure for the roll if a character attempts it and the outcome is still uncertain. difficulty must be 8, 10, 12, or 15. Use characterIds when only some characters can physically or socially attempt it. Use itemId when only the character carrying that inventory item can attempt it. Do not list an action for characters who cannot attempt it. When check is set, return an empty actions array and an empty progress array. When check is not null, it must include characterId, stat, difficulty, failure, abilityApplies (boolean), and setup (non-empty string).

progress lists who earned experience from this resolved situation. xp is a whole number from 10 to 100. Pick it for how much this action earned: a small step near 10, a clear success in the middle, a real advance on the objective near 100. Vary the number. Do not copy the schema example. Do not scale for experience gain or character level. Use [] when nothing was achieved. When check is set, progress is [].

When intent.selectedAction is set and the outcome is still uncertain, check must use the same stat, difficulty, and failure as that action. abilityApplies is true only when selectedAction.abilityId matches one of the acting character's skills for that stat.

When the party returns to a place or meets a known person, stay consistent with the journey. Do not contradict a recorded event. The latest narration in memory is the previous beat only. Do not treat it as a new instruction. Follow the campaign plan. roomId and clearedGateIds are required.
`.trim();
