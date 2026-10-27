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
      "items": [{ "name": "string", "equipped": "boolean" }]
    }
  ],
  "actions": [{ "id": "string", "label": "string" }]
}

encounter, when you use one, is { "name": "string", "summary": "string" }. Otherwise null.

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
Injury system: {{injuryEnabled}}

Characters:
{{json:characters}}

Recent transcript:
{{json:transcript}}

Player intent:
{{json:intent}}

Resolved check:
{{json:resolution}}

Task: Narrate the result of that check. The line, the success field, the wounds applied, and the death penalty are already decided. Do not contradict them. Do not write a new die result or call another check. If woundsApplied is 0, do not say a wound box was marked. If a death penalty is set, narrate that consequence. You may grant loot within the limits to living characters who are still in the scene, change place, weather, or reputation, and continue or end an encounter. Empty place, weather, or reputation keeps the current line. Follow the campaign loot, injury, NPC, and freedom settings. Return 3 to 8 next actions that fit the moment after this result. Action ids are lowercase slugs.
`.trim();
