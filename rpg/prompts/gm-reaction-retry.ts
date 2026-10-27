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
  ]
}

Limits:
{{json:limits}}

Validation error:
{{validationError}}

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

Task: Fix the JSON. React only to that intent. When the outcome is certain, check is null, loot stays within the limits, and actions has 3 to 8 specific entries. Each action needs stat, difficulty, failure, and precise labels. Use characterIds or itemId when only some characters can attempt it. Action ids use hyphens only, no underscores. When intent.selectedAction is set and the outcome is uncertain, check must match that action's stat, difficulty, and failure. When the outcome is uncertain without a selectedAction, check is set, loot is empty, and actions is empty. Do not write a die result, a total, or a success word.
`.trim();
