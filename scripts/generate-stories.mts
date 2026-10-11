/**
 * Pre-generates the "darshan stamp" cards for every stop with the local model, so a walk works
 * with no model and no signal. Run: npm run stories             (English, skips existing)
 *                                  npm run stories -- --lang bn --force
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PANDALS } from "../src/lib/data/pandals";
import { MODEL, health } from "../src/lib/ai/ollama";
import { generateStory } from "../src/lib/stories";
import type { StoryPack } from "../src/lib/types";

const OUT = fileURLToPath(new URL("../src/lib/data/stories.generated.json", import.meta.url));
const args = process.argv.slice(2);
const lang = (args[args.indexOf("--lang") + 1] === "bn" ? "bn" : "en") as "en" | "bn";
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

const h = await health();
if (!h.reachable || !h.modelPresent) {
  console.error(`Ollama at ${h.host} is ${h.reachable ? `missing ${MODEL}` : "not reachable"}. Run: ollama pull ${MODEL}`);
  process.exit(1);
}

const store = JSON.parse(readFileSync(OUT, "utf8")) as Record<string, Partial<Record<"en" | "bn", StoryPack>>>;
const targets = PANDALS.filter((p) => (!only || only.includes(p.id)) && (force || !store[p.id]?.[lang]));
console.log(`Generating ${targets.length} ${lang} cards with ${MODEL}…`);

for (const [i, p] of targets.entries()) {
  const t0 = Date.now();
  let story: StoryPack | null = null;
  for (let attempt = 0; attempt < 3 && !story; attempt++) {
    try {
      story = await generateStory(p.id, lang);
    } catch (e) {
      console.warn(`  ${p.id}: ${(e as Error).message}`);
    }
  }
  if (!story) {
    console.warn(`  ✗ ${p.id} (kept curated fallback)`);
    continue;
  }
  store[p.id] = { ...store[p.id], [lang]: story };
  writeFileSync(OUT, `${JSON.stringify(store, null, 2)}\n`);
  console.log(`  ✓ [${i + 1}/${targets.length}] ${p.name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
