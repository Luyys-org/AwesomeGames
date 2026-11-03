export default `
Limits:
{
  "shape": {{shapeMax}},
  "features": {{featuresMax}}
}

Room:
{{json:room}}

Exits that must each receive one door:
{{json:exits}}

Task: Describe this one room from above for a floor-plan image. shape is the footprint in one line. features is furniture, cover, and light in one line, with no people. doors lists every exit once. placeId is copied from that exit. wall is north, east, south, or west, and each wall is used at most once. Do not add an exit. Do not leave an exit out. When exits is empty, doors is an empty array.
`.trim();
