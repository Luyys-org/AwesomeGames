export default `
Limits:
{{json:limits}}

Party:
{{json:characters}}

Scenes:
{{json:scenes}}

Language: {{language}}
Write item names in that language. Keep JSON keys and ids in English.

Task: For every scene id, write one reward for every living character. Read the party count and each character's stats, class, and race. xp is a whole number from 10 to 100. currency is a whole number from 0 to that character's currency max. items fit that character: a modifier uses one of their stat ids, kind stat or roll, and an amount from −3 to −1 or 1 to 3. Use an empty modifiers array when the item has no mechanical effect. Give at most itemMax items, and fewer when loot is scarce. Do not add, remove, or rename scenes. Do not change rooms, actions, or encounters.
`.trim();
