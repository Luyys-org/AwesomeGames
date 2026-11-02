export default `
Limits:
{
  "situation": 800,
  "place": 80,
  "weather": 80,
  "reputation": 80
}

Campaign:
{{json:campaign}}

Start place. The party begins here, in the first scene. place must be this place's name:
{{json:startPlace}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Write the opening situation for scene 1. The party is in the start place, ready to act toward that scene's objective, not the end of the campaign objective. place is the start place name. Also name the weather and the party's reputation there.
`.trim();
