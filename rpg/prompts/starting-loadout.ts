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

Campaign:
{{json:campaign}}

Current situation:
{{situation}}

Place: {{place}}
Currency name: {{currencyName}}

Characters:
{{json:characters}}

Task: Create a starting kit for each living character and 3 to 8 actions the party can take in the current situation. Pick currency as a whole number inside that character's currencyMin and currencyMax. Those bounds already combine starting wealth and currency abundance. Invent starting equipment that fits the character's class and race, with a count inside itemMin and itemMax. Mark worn or wielded items equipped true, packed items false. Action ids are lowercase slugs. Action labels are short commands the player can choose. Those actions must be coherent with the current situation and the character's abilities.
`.trim();
