export default `
Language: {{language}}
Write player-facing prose in that language. Keep the outcome. Do not write a die result, a total, or a success word.

Room:
{{roomNarration}}

Scene:
{{sceneNarration}}

What happened:
{{facts}}

Task: Write the one passage the players read for that outcome. Use the room and the scene. Do not add a foe, a reward, a place, travel, or a problem that is not in What happened. Do not choose a next action.
`.trim();
