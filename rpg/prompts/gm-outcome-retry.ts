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

Player intent:
{{json:intent}}

Resolved check:
{{json:resolution}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON and narrate the resolved check. The latest narration in memory is atmosphere from before the roll. The resolution object is the result. Do not repeat it, and do not contradict success, woundsApplied, or deathPenalty. Do not call another check. Loot stays within the limits. Return 3 to 8 specific actions with stat, difficulty, failure, and ids using hyphens only, no underscores. progress uses minor, notable, or major, or []. Do not write an XP number. Stay consistent with the journey.
`.trim();
