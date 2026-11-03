export default `
Limits:
{
  "itemName": 80,
  "actionId": 32,
  "actionLabel": 72,
  "actions": { "min": 3, "max": 8 }
}

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

{{task}}
`.trim();
