#!/usr/bin/env node
// Dev helper: geocode place names with OpenStreetMap Nominatim (1 req/sec, per usage policy).
// Usage: node scripts/geocode.mjs "College Square, Kolkata" "Maddox Square, Kolkata"
const queries = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const q of queries) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "3");
  url.searchParams.set("countrycodes", "in");
  const res = await fetch(url, {
    headers: { "User-Agent": "pandal-quest-dev/0.1 (hackathon project; geocoding curated dataset)" },
  });
  const rows = res.ok ? await res.json() : [];
  if (!rows.length) {
    console.log(`MISS\t${q}`);
  } else {
    for (const r of rows.slice(0, 2)) {
      console.log(`${(+r.lat).toFixed(5)}\t${(+r.lon).toFixed(5)}\t${q}\t=> ${r.display_name.slice(0, 110)}`);
    }
  }
  await sleep(1100);
}
