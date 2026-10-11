# Pandal Quest

**Plan in thirty seconds. Walk all night.**

A Durga Puja pandal-hopping companion for Kolkata. You describe the evening the way you’d tell a friend — *Saptami with my parents from Shyambazar, nothing with a long queue, Kumartuli is a must.* A local copy of [Gemma 4](https://ai.google.dev/gemma) turns that into a typed request. A deterministic planner then builds a walking route that treats queues as a first-class cost. Then the app tries to disappear.

Pocket mode keeps GPS alive on a black screen. A synthesised dhak drum plays when you arrive. Each pandal’s story card unlocks only when you’re standing there. At the end you get a **Touch Grass receipt**: minutes looking at Durga versus minutes looking at glass.

Built for the [DEV.to Hacktoberfest Open-Source AI Challenge, week 1 — Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05). The screen is the shortest part of the night.

## Why this, and why open

Kash phool (a literal grass) blooming on the Maidan is how Kolkata knows Pujo is coming. Satyajit Ray put that field in *Pather Panchali*. UNESCO listed this puja as intangible heritage in 2021. On the peak nights the mobile network dies — College Square at 10 pm is a dead zone.

So the AI is **open-weight and local**. Gemma 4 runs through [Ollama](https://ollama.com) on your own machine. There is no cloud API key, no usage meter, and nothing you type leaves the laptop. Story cards are generated ahead of time so a walk works with no model and no signal. The planner itself can run in the browser.

**The model decides. Code computes.** Language models are good at “we’re a family, they hate queues, start at Shyambazar.” They are bad at a time-dependent orienteering problem. A beam search with 2-opt does that part. Gemma then writes the guide from the solver’s numbers, and every pandal name is checked against the dataset so a hallucination cannot end up on the map.

Swap the model with an environment variable. Cost to run: $0.

## Features

- Natural-language planning, plus chips to fine-tune day, time, group, interests and crowd tolerance (re-solves instantly in the browser)
- Crowd Clock: a transparent heuristic (popularity × hour-of-night × puja day), not live data
- Leaflet map of the route, with wider arrival radii on approximate pins
- Walk mode: GPS, compass, demo walk, pocket mode (Screen Wake Lock), dhak + voice + vibration on arrival
- Darshan stamps, look-for checklists, one trivia question, then the phone goes away again
- Ask Dhaki: Gemma 4 native tool calling for crowds, distances and nearest metro
- Offline-friendly PWA: app shell, pre-generated stories, viewed map tiles
- Touch Grass receipt and a passport of stamps you actually walked to

## Quick start

You need Node 20+ and, for the AI features, [Ollama](https://ollama.com).

```bash
# 1. Local model (optional — the planner works without it)
ollama serve
ollama pull gemma4:e2b

# 2. App
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Without Ollama, a rule-based parser and a plain-text guide still plan a walk. The header pill tells you which mode you’re in.

```bash
npm test          # planner, matching, crowd clock, walk receipt
npm run typecheck
npm run build
npm start         # production, also on 4317
```

### Environment

| Variable | Default | What it does |
|---|---|---|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Where Ollama is listening |
| `PANDAL_QUEST_MODEL` | `gemma4:e2b` | Any Ollama chat model. Gemma 4 is what we tested (structured JSON + native tools). |
| `PANDAL_QUEST_DISABLE_AI` | unset | Set to `1` to force rules/template mode even if Ollama is up |

### Story cards

English cards for all 38 stops ship in `src/lib/data/stories.generated.json`, written by Gemma 4 ahead of time. To regenerate (or add Bengali):

```bash
npm run stories
npm run stories -- --lang bn
npm run stories -- --force --only bagbazar,sreebhumi
```

A walk never waits on the model. Missing cards fall back to a curated pack.

### On a phone

Walk mode wants HTTPS for GPS, compass and wake lock (localhost is treated as secure). From your laptop:

```bash
npx cloudflared tunnel --url http://127.0.0.1:4317
```

Open the tunnel URL on your phone, add to the home screen, go outside. For the “take it outside” bonus: start a real walk, pocket the phone, and keep the Touch Grass receipt.

## Honesty

- **Crowd numbers are a heuristic**, not live data. The formula is in `src/lib/engine/crowd.ts` and the UI says so next to every queue estimate.
- **Some pins are approximate.** Kumartuli’s workshops, a few family houses — OpenStreetMap doesn’t have a point for every courtyard. Those stops get a wider geofence and a dashed circle on the map.
- **Saturday 17 October 2026** is its own calendar row. Panjikas disagree on whether that day is Shashthi or Saptami.
- **Demo walk** is for people who aren’t in Kolkata. It is labelled. Stamps from a demo are marked as such.

## Architecture

```
you type a request
        │
        ▼
Gemma 4 ──JSON schema──► typed intent ──validate vs dataset──► planner
                                      (beam search + 2-opt)
                                              │
                                              ▼
                         Gemma streams a grounded 90–130 word guide
                                              │
                                              ▼
                         walk: GPS / demo → geofence → dhak → story card
```

If Ollama is down, the first two model steps become a regex parser and a template. The solver does not change.

## Data

38 curated stops across North, Central, South, Behala, Salt Lake and Howrah. Coordinates from [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL) unless marked `approx`. Facts are conservative on purpose: founding years and well-known character, not this year’s theme (those change, and the model is told not to invent them).

Maps: Leaflet + Esri World Street Map tiles. CARTO's keyless Voyager basemap now returns an "API key required" watermark, so the map uses Esri's public street tiles instead. Pandals are still pinned from OpenStreetMap.

## Scripts

| Script | |
|---|---|
| `npm run dev` | Next.js on port 4317 |
| `npm run stories` | Pre-generate Gemma story cards |
| `node scripts/geocode.mjs` | Nominatim helper used while pinning the dataset (1 req/s, named user agent) |

## License

MIT. See [LICENSE](LICENSE).
