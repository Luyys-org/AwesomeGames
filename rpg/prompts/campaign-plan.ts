export default `
Reply with JSON only, matching this schema:
{
  "rooms": [
    {
      "id": "gatehouse",
      "name": "Gatehouse",
      "summary": "A watched door at the edge of the quest.",
      "exits": ["courtyard"],
      "role": "start"
    }
  ],
  "gates": [
    {
      "id": "outer-door",
      "roomId": "gatehouse",
      "kind": "lock",
      "label": "Barred outer door",
      "detail": "The way on stays shut until the bar is lifted or the lock is opened."
    }
  ]
}

Limits:
{{json:bounds}}

Campaign:
{{json:campaign}}

Language: {{language}}
Write room names, summaries, gate labels, and gate details in that language. Keep JSON keys, room ids, and gate ids in English.

Task: Write the map of rooms the party can enter, and every check that must be cleared before the principal quest can end. The objective is the ending, not the opening. The party starts in the start room and cannot reach that ending by walking into the next room.

Use roomMin to roomMax rooms and gateMin to gateMax gates. The shortest path from the start room to the finale must include at least pathMin rooms. id, name, summary, label, and detail stay inside the limits. Ids use lowercase letters, digits, and hyphens only.

role is start, path, or finale. Use exactly one start and one finale. Every other room is path. exits lists room ids. Travel is two-way: if one room lists another, list the return as well. No room exits to itself. Every room is reachable from the start.

Each gate is one check the party must finish: a lock, a boss, an obstacle, or a clue. The finale has exactly one gate and its kind is boss. At least two gates sit outside the finale. At least one gate sits in a room that is neither the start nor the finale. Put gates on the path between the start and the finale so the party cannot walk that path empty. A lock is a closed way. A boss is a foe that must be beaten. An obstacle is a hazard or barrier. A clue is knowledge or an item the quest needs before the end.

Player freedom narrow keeps the map close to one path, with at most one room off that path. Guided keeps the path clear and allows one or two side rooms. Open allows side rooms, and still gives no exit that skips a gate on the way to the finale.

Do not copy the schema example. Do not resolve the objective in this JSON. Do not include a current room or a cleared status.
`.trim();
