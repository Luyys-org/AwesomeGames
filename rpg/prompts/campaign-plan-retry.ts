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

Validation error:
{{validationError}}

Limits:
{{json:bounds}}

Campaign:
{{json:campaign}}

Language: {{language}}
Write room names, summaries, gate labels, and gate details in that language. Keep JSON keys, room ids, and gate ids in English.

Task: Fix the JSON. Return only rooms and gates. Use roomMin to roomMax rooms and gateMin to gateMax gates. The shortest path from start to finale includes at least pathMin rooms. Exactly one start, one finale, and the other rooms are path. Exits are two-way room ids. The finale has exactly one boss gate. At least two gates sit outside the finale, and at least one of those is neither in the start nor the finale. Ids are lowercase with hyphens. Do not copy the schema example.
`.trim();
