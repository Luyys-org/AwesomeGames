export default `
Reply with JSON only, matching this schema:
{
  "kits": [
    {
      "characterId": "string",
      "currency": "integer",
      "inventory": [{ "name": "string", "equipped": "boolean" }]
    }
  ],
  "actions": [{ "id": "string", "label": "string" }]
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

Task: Fix the JSON and return only { "kits", "actions" } matching the schema.
`.trim();
