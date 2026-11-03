export default `
Limits:
{{json:bounds}}

Campaign:
{{json:campaign}}

Language: {{language}}
Write scene names, place names, summaries, objectives, narration, action labels, and encounter names in that language. Keep JSON keys and ids in English.

Task: Write the campaign as two linked lists. The campaign map is a linked list of scenes. Each scene map is a linked list of places. Each scene has one objective, and that objective is a step toward the campaign objective. The party starts at the first place of the first scene. They reach the campaign objective only by finishing the scene objectives in order.

Use sceneMin to sceneMax scenes. Each scene has placeMin to placeMax places. id, name, summary, objective, narration, and line stay inside the limits. Ids use lowercase letters, digits, and hyphens only. Every scene id and place id is unique in the plan. Every scene name and place name is unique across the plan.

next is the id of the following node, or an empty string on the last node. A scene's next names a scene. A place's next names a place in that same scene. Exactly one scene has an empty next, and that scene is last. Exactly one place in each scene has an empty next, and that place is last. Following next from the first node visits every node once. No node points at itself. No node has two predecessors.

Each scene objective is one concrete step the party must finish in that scene before the next scene. In order, those steps are how the party reaches the campaign objective. The last scene's objective is the act that achieves the campaign objective. Do not copy the campaign objective into a scene. Do not repeat an objective. The party can finish a scene objective only from the last place of that scene.

Each scene also has narration, success, and failure. narration says what the scene is for. success is the consequence of clearing that objective. failure is the consequence of failing the check that would clear it. The last scene's success is how the party achieves the campaign objective. failure does not invent a new quest.

Each place also has narration, actions, and encounters. narration is the problem in that room, or its purpose, such as a merchant, an obstacle, or an NPC. It must match the place summary. actions are 2 to 4 commands that only make sense in that room. Labels name a concrete task, not Explore or Interact. Action ids are lowercase slugs with hyphens, at most 32 characters, and unique in the plan. stat is a campaign stat id. difficulty is 8, 10, 12, or 15. failure is setback, harm, or severe. abilityId is a skill id when that skill alone fits the action, otherwise "". effect is stay, next-place, clear-scene, or encounter. next-place follows that place's next, or, on the last place of a scene that has a next scene, enters that next scene. clear-scene is legal only on the last place of a scene. encounter names an encounter in that same place through encounterId. Other effects leave encounterId empty. certain is true only when the outcome is already sure, such as talking to a merchant or reading a sign. An encounter action is never certain. setup is the stake shown before dice. success and miss are one line each: what changes if the check succeeds, and what changes if it fails. Every place that is not last needs a next-place action. Every last place needs a clear-scene action. The last place of a scene that has a next scene also needs a next-place action.

encounters lists the foes in that room. It may be empty. Each encounter has id, name, summary, triggerActionId, defeat, and malus. triggerActionId is the id of the encounter action that makes those foes appear. defeat.xp is a whole number from 10 to 100. defeat.currency is a whole number from 0 to the currency max. defeat.items uses the item shape, and only as many as the loot limit allows. malus.wounds is 0, 1, or 2. malus.consequence is what the miss costs, and nothing else. Match encounter frequency: low means few rooms have an encounter, standard means about half, high means most rooms. Do not put an encounter in every room when frequency is low.

Do not resolve an objective in this JSON. Do not include a current scene, a current place, a cleared status, or character rewards.

Player freedom does not add a branch. Narrow, guided, and open all use a single next pointer.
`.trim();
