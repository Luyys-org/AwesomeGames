export default `
Reply with JSON only, matching this schema:
{
  "kits": [
    {
      "characterId": "string",
      "currency": "integer",
      "inventory": [
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
{
  "itemName": 80,
  "actionId": 32,
  "actionLabel": 48,
  "actions": { "min": 3, "max": 8 }
}

Validation error:
{{validationError}}

Campaign:
{{json:campaign}}

Current situation:
{{situation}}

Place: {{place}}
Currency name: {{currencyName}}

Characters:
{{json:characters}}

Campaign plan:
{{json:plan}}

{{planNote}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON and return only { "kits", "actions" } matching the schema. Each action needs stat, difficulty, failure, precise labels, and ids with hyphens only, no underscores. When a campaign plan is present, those actions pursue its next gate or travel toward that gate. They do not finish the principal quest.
`.trim();
