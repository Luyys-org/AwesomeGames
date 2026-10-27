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

Task: Fix the JSON and return only { "situation", "place", "weather", "reputation" }.
`.trim();
