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

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Write the opening situation for scene 1. Put the party in the fiction ready to act toward the objective. Also name the place, the weather, and the party's reputation there.
`.trim();
