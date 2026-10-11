import type { Pandal, StoryPack } from "@/lib/types";

/** Hand-checked Durga Puja trivia used when no model output exists for a stop. */
export const TRIVIA_BANK: StoryPack["trivia"][] = [
  { q: "Which animal carries Goddess Durga into battle?", options: ["Lion", "Elephant", "Peacock", "Swan"], answer: 0 },
  { q: "Whose vahana is the owl?", options: ["Saraswati", "Lakshmi", "Kartik", "Ganesha"], answer: 1 },
  { q: "Which of Durga's children rides a peacock?", options: ["Ganesha", "Kartik", "Lakshmi", "Saraswati"], answer: 1 },
  { q: "What is the painted arch behind a traditional Durga idol called?", options: ["Chalchitra", "Alpona", "Dhunuchi", "Shola"], answer: 0 },
  { q: "Which demon does Durga slay?", options: ["Ravana", "Mahishasura", "Kamsa", "Hiranyakashipu"], answer: 1 },
  { q: "On which day do married women play sindoor khela?", options: ["Saptami", "Ashtami", "Navami", "Dashami"], answer: 3 },
  { q: "Sandhi Puja happens at the junction of which two days?", options: ["Shashthi and Saptami", "Ashtami and Navami", "Navami and Dashami", "Saptami and Ashtami"], answer: 1 },
  { q: "Which drum sets the heartbeat of every pandal?", options: ["Tabla", "Dhak", "Mridangam", "Pakhawaj"], answer: 1 },
  { q: "In 2021 UNESCO added Kolkata's Durga Puja to which list?", options: ["World Heritage Sites", "Intangible Cultural Heritage of Humanity", "Memory of the World", "Creative Cities"], answer: 1 },
  { q: "Kola Bou, bathed at dawn on Saptami, is actually…", options: ["A banana plant wrapped in a sari", "A clay doll", "A river stone", "A brass lamp"], answer: 0 },
  { q: "How many lamps are lit during Sandhi Puja?", options: ["21", "51", "108", "1001"], answer: 2 },
  { q: "Which of Durga's children rides a mouse?", options: ["Kartik", "Ganesha", "Lakshmi", "Saraswati"], answer: 1 },
];

const LOOK_FOR: Record<Pandal["kind"], string[]> = {
  pandal: [
    "Find Ganesha's mouse hiding near his feet",
    "Spot Lakshmi's owl and Saraswati's swan",
    "Look up at the arch framing the whole family",
  ],
  bonedi: [
    "Look at the thakur-dalan's pillars and arches",
    "Watch how the family members run the rituals",
    "Listen for the conch shells at arati",
  ],
  landmark: [
    "Watch an artisan smooth clay with bare hands",
    "Find an idol with straw still showing through",
    "Spot bamboo frames stacked along the lane",
  ],
};

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function fallbackStory(p: Pandal): StoryPack {
  return {
    id: p.id,
    story: `You made it to ${p.name}. ${p.knownFor}`,
    lookFor: LOOK_FOR[p.kind],
    trivia: TRIVIA_BANK[hash(p.id) % TRIVIA_BANK.length],
    model: "curated",
    lang: "en",
  };
}

const LOOK_RE = /^(touch|taste|climb|kiss|enter the sanctum)/i;

/** Drops look-for lines that tell people to touch idols or clay, and strips A/B/C prefixes on trivia. */
export function polishStory(pack: StoryPack, p: Pandal): StoryPack {
  const curated = LOOK_FOR[p.kind];
  const lookFor = pack.lookFor.map((item, i) => {
    const clean = item.replace(/\.$/, "").trim();
    if (LOOK_RE.test(clean) || clean.length < 8) return curated[i] ?? clean;
    return clean;
  });
  while (lookFor.length < 3 && lookFor.length < curated.length) lookFor.push(curated[lookFor.length]);
  const options = pack.trivia.options.map((o) => o.replace(/^[A-D]\.\s*/i, "").replace(/^[IVX]+\.\s*/i, "").trim());
  return { ...pack, lookFor: lookFor.slice(0, 3), trivia: { ...pack.trivia, options } };
}

/** Rejects malformed model output so a broken card never reaches the walker. */
export function sanitizeStory(raw: unknown, p: Pandal, model: string, lang: "en" | "bn"): StoryPack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const trivia = r.trivia as Record<string, unknown> | undefined;
  const options = Array.isArray(trivia?.options) ? (trivia!.options as unknown[]).map(String).filter(Boolean) : [];
  const answer = typeof trivia?.answer === "number" ? trivia.answer : -1;
  const lookFor = Array.isArray(r.lookFor) ? (r.lookFor as unknown[]).map(String).filter(Boolean).slice(0, 3) : [];
  if (typeof r.story !== "string" || r.story.length < 20 || lookFor.length < 2) return null;
  if (typeof trivia?.q !== "string" || options.length < 3 || answer < 0 || answer >= options.length) return null;
  return polishStory(
    {
      id: p.id,
      story: r.story.trim(),
      lookFor,
      trivia: { q: trivia.q, options, answer },
      model,
      lang,
    },
    p,
  );
}
