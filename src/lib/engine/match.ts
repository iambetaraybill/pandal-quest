import { PANDALS } from "@/lib/data/pandals";
import { PLACES } from "@/lib/data/places";
import type { Pandal, StartPlace } from "@/lib/types";

const FILLER = /\b(sarbojanin|sarbajanin|durgotsav|durgotsab|durga|puja|pujo|club|metro|station|the|er|r)\b/g;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAlias(query: string, alias: string): number {
  const q = normalize(query);
  const a = normalize(alias);
  if (!q || !a) return 0;
  if (q === a) return 1;
  if (q.includes(a) || a.includes(q)) return 0.85 * (Math.min(q.length, a.length) / Math.max(q.length, a.length)) + 0.1;
  const qt = new Set(q.split(" "));
  const at = a.split(" ");
  const overlap = at.filter((t) => qt.has(t)).length;
  return overlap ? (0.6 * overlap) / at.length : 0;
}

function bestMatch<T extends { name: string; aliases: string[] }>(query: string, items: T[], threshold: number): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    for (const alias of [item.name, ...item.aliases]) {
      const s = scoreAlias(query, alias);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }
  }
  return bestScore >= threshold ? best : null;
}

export function matchPandal(query: string): Pandal | null {
  return bestMatch(query, PANDALS, 0.45);
}

export function matchPlace(query: string): StartPlace | null {
  return bestMatch(query, PLACES, 0.45);
}

/** Finds every pandal alias mentioned anywhere inside free text. */
export function findPandalsInText(text: string): Pandal[] {
  const t = ` ${normalize(text)} `;
  const found: Pandal[] = [];
  for (const p of PANDALS) {
    const hit = [p.name, ...p.aliases].some((a) => {
      const n = normalize(a);
      return n.length >= 4 && t.includes(` ${n} `);
    });
    if (hit) found.push(p);
  }
  return found;
}

export function findPlaceInText(text: string): StartPlace | null {
  const t = ` ${normalize(text)} `;
  let best: StartPlace | null = null;
  let bestLen = 0;
  for (const p of PLACES) {
    for (const a of [p.name, ...p.aliases]) {
      const n = normalize(a);
      if (n.length >= 4 && t.includes(` ${n} `) && n.length > bestLen) {
        best = p;
        bestLen = n.length;
      }
    }
  }
  return best;
}
