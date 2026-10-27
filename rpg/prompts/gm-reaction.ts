export default `
Reply with JSON only, matching this schema:
{
  "narration": "string",
  "encounter": null,
  "place": "string",
  "weather": "string",
  "reputation": "string",
  "check": null,
  "loot": [
    {
      "characterId": "string",
      "currency": "integer",
      "items": [{ "name": "string", "equipped": "boolean" }]
    }
  ],
  "actions": [{ "id": "string", "label": "string" }]
}

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
Situation:
{{situation}}

Place: {{place}}
Weather: {{weather}}
Reputation: {{reputation}}
Currency name: {{currencyName}}
Preferred check difficulty: {{preferredDifficulty}}
Injury system: {{injuryEnabled}}

Characters:
{{json:characters}}

Recent transcript:
{{json:transcript}}

Player intent:
{{json:intent}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: React to that intent and to no later intent. kind speak means the character said the text. kind act means the character chose that action. You may answer with dialogue, a discovery, travel, a complication, an encounter, loot, a stat check, or a mix the fiction supports. Follow the campaign settings for tone, enemy difficulty, encounter frequency, random encounters, loot rarity, loot quantity, currency, player freedom, healing, NPC mortality, factions, PvP, and theft.

Player freedom narrow allows only what this situation already contains. Guided allows anything this scene can contain. Open allows anything that character could attempt. The intent is already accepted. The attempt can still fail.

If the result is already certain, set check to null and resolve it in narration. You may then grant loot to a character who is in the scene. currency is a whole number from 0 to the currency max, added to that character. Give items only when the loot settings support them. Low or scarce loot usually means an empty loot array. Do not copy an item that character already carries unless the fiction finds another. Do not move gear from one player character to another when theft between players is off.

If the result is uncertain or opposed, set check and leave loot empty. You may still open an encounter. Narration and setup stop before the result. Do not write a die result, a total, or a success word. check.characterId is the acting character. stat is one of the campaign stat ids and fits the attempt, not the character's highest stat. difficulty is 8, 10, 12, or 15. Prefer the preferred difficulty. Use another legal difficulty when the fiction requires it, including a boss. abilityApplies is true only when one of that character's skills uses that stat and the intent fits that skill. failure is setback, harm, or severe. Use harm or severe only when the injury system is on and the actor can be wounded. Use setback when a miss should not mark a wound.

Match encounter frequency. Do not start an encounter on every reply. When you set encounter, name it and include that trouble in the narration. Empty place, weather, or reputation keeps the current line. A non-empty line replaces it.

Do not change the objective, stats, wound boxes, or who has died. Do not set player characters against each other when PvP is off. Do not kill a named NPC when NPC mortality is off. Player characters are allies.

When check is null, replace the scene actions with 3 to 8 short commands the party can take next. Action ids are lowercase slugs. Those actions must fit the moment you just created. When check is set, return an empty actions array.
`.trim();
