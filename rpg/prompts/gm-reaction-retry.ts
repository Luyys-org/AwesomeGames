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
  "progress": [{ "characterId": "string", "tier": "minor" }]
}

Limits:
{{json:limits}}

Validation error:
{{validationError}}

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

Player intent:
{{json:intent}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON. React only to that intent. When the outcome is certain, check is null, loot stays within the limits, progress uses minor, notable, or major with no XP number, and actions has 3 to 8 specific entries. Each action needs stat, difficulty (8, 10, 12, or 15), failure, and precise labels. Action ids use hyphens only, no underscores, and at most 32 characters each. Use characterIds or itemId when only some characters can attempt it. When intent.selectedAction is set and the outcome is uncertain, check must match that action's stat, difficulty, and failure, and progress is empty. When the outcome is uncertain without a selectedAction, check is set with all of characterId, stat, difficulty, failure, abilityApplies, and setup; loot is empty; actions is empty; progress is empty. Do not write a die result, a total, or a success word. Stay consistent with the journey. Do not contradict a recorded event.
`.trim();
