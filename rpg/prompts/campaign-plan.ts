export default `
Limits:
{{json:bounds}}

Campaign:
{{json:campaign}}

Language: {{language}}
Write scene names, place names, summaries, and scene objectives in that language. Keep JSON keys and ids in English.

Task: Write the campaign as two linked lists. The campaign map is a linked list of scenes. Each scene map is a linked list of places. Each scene has one objective, and that objective is a step toward the campaign objective. The party starts at the first place of the first scene. They reach the campaign objective only by finishing the scene objectives in order.

Use sceneMin to sceneMax scenes. Each scene has placeMin to placeMax places. id, name, summary, and objective stay inside the limits. Ids use lowercase letters, digits, and hyphens only. Every scene id and place id is unique in the plan. Every scene name and place name is unique across the plan.

next is the id of the following node, or an empty string on the last node. A scene's next names a scene. A place's next names a place in that same scene. Exactly one scene has an empty next, and that scene is last. Exactly one place in each scene has an empty next, and that place is last. Following next from the first node visits every node once. No node points at itself. No node has two predecessors.

Each scene objective is one concrete step the party must finish in that scene before the next scene. In order, those steps are how the party reaches the campaign objective. The last scene's objective is the act that achieves the campaign objective. Do not copy the campaign objective into a scene. Do not repeat an objective. The party can finish a scene objective only from the last place of that scene.

Do not resolve an objective in this JSON. Do not include a current scene, a current place, or a cleared status.

Player freedom does not add a branch. Narrow, guided, and open all use a single next pointer.
`.trim();
