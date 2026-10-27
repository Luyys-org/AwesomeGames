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

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Narrate the result of that check. The line, the success field, the wounds applied, and the death penalty are already decided. Do not contradict them. Do not write a new die result or call another check. If woundsApplied is 0, do not say a wound box was marked. If a death penalty is set, narrate that consequence. You may grant loot within the limits to living characters who are still in the scene, change place, weather, or reputation, and continue or end an encounter. Each loot item needs slot, a lowercase slug such as head, chest, hands, or weapon, and a modifiers array using campaign stat ids, kind stat or roll, and amounts from −3 to −1 or 1 to 3. Only one equipped item can use the same slot. Use an empty slot only for items that do not occupy a wear slot. Use an empty modifiers array when the item has no mechanical effect. Empty place, weather, or reputation keeps the current line. Follow the campaign loot, injury, NPC, and freedom settings. Return 3 to 8 next actions that fit the moment after this result. Action ids are lowercase slugs with hyphens only, no underscores (for example enter-cantina, not enter_cantina).
`.trim();
