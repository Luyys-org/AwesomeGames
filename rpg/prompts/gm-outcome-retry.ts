export default `
Reply with JSON only, matching this schema:
{
  "narration": "string",
  "encounter": null,
  "place": "string",
  "weather": "string",
  "reputation": "string",
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
  "progress": [{ "characterId": "string", "tier": "notable" }]
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
Injury system: {{injuryEnabled}}

Characters:
{{json:characters}}

Recent transcript:
{{json:transcript}}

Player intent:
{{json:intent}}

Resolved check:
{{json:resolution}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON and narrate the resolved check. Do not contradict the line or the wounds. Do not call another check. Loot stays within the limits. Return 3 to 8 specific actions with stat, difficulty, failure, and ids using hyphens only, no underscores. progress uses minor, notable, or major, or []. Do not write an XP number.
`.trim();
