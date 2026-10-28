export default `
Reply with JSON only, matching this schema:
{
  "narration": "string",
  "encounter": null,
  "place": "string",
  "weather": "string",
  "reputation": "string",
  "situations": [{ "characterId": "string", "situation": "standing" }],
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
  "progress": [{ "characterId": "string", "xp": 55 }],
  "roomId": "",
  "clearedGateIds": []
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

Campaign plan:
{{json:plan}}

{{planRules}}

latestNarration was already shown before the dice. Narration is the next thing players read. Open with the consequence of the resolved check. Do not retell or paraphrase that passage.

Player intent:
{{json:intent}}

Resolved check:
{{json:resolution}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON and narrate only the consequence of the resolved check. Players already read the situation, then the dice line. Do not restate the place, the attempt, or the stake. The first sentence is what changes because the check succeeded or failed. The resolution object is the result. Do not repeat its numbers, and do not contradict success, woundsApplied, or deathPenalty. Do not call another check. Loot stays within the limits. Return 3 to 8 specific actions with stat, difficulty (8, 10, 12, or 15), failure, and ids using hyphens only, no underscores, at most 32 characters each. progress xp is a whole number from 10 to 100 chosen for that result, or []. Do not copy the schema example. Do not scale it for experience gain or level. Stay consistent with the journey. situations is an array of { characterId, situation }. situation is one of {{situationList}}. Use [] to leave every situation unchanged. Narration must match the situations you keep. A character whose wounds include down stays unconscious. Follow the campaign plan. roomId and clearedGateIds are required. A failed check leaves roomId empty and clearedGateIds empty.
`.trim();
