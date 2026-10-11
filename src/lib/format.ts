/** "gemma4:e2b" -> "Gemma 4 E2B", "gemma3:4b" -> "Gemma 3 4B"; anything else is returned as-is. */
export function prettyModel(model: string | null | undefined): string {
  if (!model) return "no model";
  const m = /^gemma(\d+(?:\.\d+)?)n?(?::(.+))?$/i.exec(model);
  if (!m) return model;
  const tag = m[2] && m[2] !== "latest" ? ` ${m[2].toUpperCase()}` : "";
  return `Gemma ${m[1]}${tag}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
