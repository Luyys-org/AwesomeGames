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

Task: Create a starting kit for each living character and 3 to 8 specific actions the party can take in the current situation. Pick currency as a whole number inside that character's currencyMin and currencyMax. Those bounds already combine starting wealth and currency abundance. Invent starting equipment that fits the character's class and race, with a count inside itemMin and itemMax. Mark worn or wielded items equipped true, packed items false. Each item must include slot, a lowercase slug such as head, chest, hands, or weapon. Only one equipped item can use the same slot. Use an empty slot only for items that do not occupy a wear slot. Each item must include a modifiers array. Use kind stat or roll, campaign stat ids in statId, and integer amounts from −3 to −1 or 1 to 3. Use an empty modifiers array when an item has no mechanical effect. Action ids use hyphens only, no underscores, and at most 32 characters each. Labels name a concrete task at this place, not vague Explore or Interact commands. Every action includes stat, difficulty (8, 10, 12, or 15), and failure for the roll if attempted. Use characterIds when only some characters can attempt it. Use itemId when only the character carrying that inventory item can attempt it. When a campaign plan is present, those actions pursue its next gate or travel toward that gate. They do not finish the principal quest.
`.trim();
