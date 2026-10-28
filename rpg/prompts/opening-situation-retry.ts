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

Validation error:
{{validationError}}

Campaign:
{{json:campaign}}

Start room. place must be this name:
{{json:startRoom}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Fix the JSON and return only { "situation", "place", "weather", "reputation" }. place is the start room name. The party is in that room, not at the end of the objective.
`.trim();
