export default `
Reply with JSON only, matching this schema:
{
  "prompt": "string"
}

Limits:
{
  "prompt": 1000
}

Campaign:
{{json:campaign}}

Current fiction:
{{json:context}}

Language for any visible text in the image: {{language}}

Task: Write one image-generation prompt in English. Focus on environment, lighting, weather, architecture, and mood. Match the campaign universe and current place. Do not name player characters. Anonymous distant figures are allowed. If postures are listed, those figures must match them: a tied, imprisoned, grappled, or unconscious figure is not free and standing. No text overlays, logos, or watermarks in the scene.
`.trim();
