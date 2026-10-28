export default `
Reply with JSON only, matching this schema:
{
  "situation": "string",
  "place": "string",
  "weather": "string",
  "reputation": "string"
}

Limits:
{
  "situation": 800,
  "place": 80,
  "weather": 80,
  "reputation": 80
}

Campaign:
{{json:campaign}}

Start room. The party begins here. place must be this name:
{{json:startRoom}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Write the opening situation for scene 1. The party is in the start room, ready to act toward the first gate, not the end of the objective. place is the start room name. Also name the weather and the party's reputation there.
`.trim();
