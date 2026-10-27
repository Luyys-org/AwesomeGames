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

Task: Fix the JSON. React only to that intent. When the outcome is certain, check is null, loot stays within the limits, and actions has 3 to 8 entries. When the outcome is uncertain, check is set, loot is empty, and actions is empty. Do not write a die result, a total, or a success word.
`.trim();
