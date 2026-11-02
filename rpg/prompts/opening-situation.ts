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

Campaign plan. Read this and write the opening from it. The party begins at the first place of the first scene:
{{json:plan}}

Start place. place must be this place's name:
{{json:startPlace}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys, stat ids, and action ids in English.

Task: Write the opening situation for scene 1 as clear, complete sentences a player can read. Take the place, the scene, and the immediate objective from the campaign plan. Do not copy a plan field when its wording is incomplete. Rewrite those facts as prose. The party is in the start place, ready to act toward that scene's objective, not the end of the campaign objective. Do not move them to a later place. place is the start place name. Also name the weather and the party's reputation there.
`.trim();
