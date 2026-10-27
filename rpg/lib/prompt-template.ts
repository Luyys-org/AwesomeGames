const PLACEHOLDER = /\{\{\s*(json:)?\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}/g;

/** Fill `{{name}}` or `{{json:name}}` from vars. Dotted paths are allowed. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  const source = template.replace(/\r\n/g, "\n");
  return source
    .replace(PLACEHOLDER, (_match, jsonFlag: string | undefined, path: string) => {
      const value = readPath(vars, path);
      if (value === undefined) {
        throw new Error(`Missing prompt value: ${path}`);
      }
      return formatValue(value, Boolean(jsonFlag));
    })
    .trim();
}

function readPath(root: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, root);
}

function formatValue(value: unknown, asJson: boolean): string {
  if (asJson) return JSON.stringify(value, null, 2);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "";
  return JSON.stringify(value, null, 2);
}
