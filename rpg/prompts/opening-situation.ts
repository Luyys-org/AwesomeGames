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

Players read this in the lobby before they create characters. The party is already in this room:

Place: {{placeName}}
Room: {{placeNarration}}
Scene: {{sceneName}}
Scene situation: {{sceneNarration}}
Scene objective: {{sceneObjective}}

Start place. place must be this place's name:
{{json:startPlace}}

Language: {{language}}
Write player-facing prose in that language. Keep JSON keys and ids in English.

Task: Rewrite the room and the scene situation as clear, complete sentences. This is the only situation the lobby shows. Do not copy a field when its wording is incomplete. Do not add a foe, a reward, a place, or a problem that is not already in the room or the scene situation. The party is in the start place, ready to act toward that scene's objective, not the end of the campaign objective. place is the start place name. Name the weather and the party's reputation only when the room already implies them. Otherwise leave weather and reputation empty.
`.trim();
