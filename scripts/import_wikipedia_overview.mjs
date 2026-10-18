// import_wikipedia_overview.mjs - Build canonical-sources/sections/game-overview.json from the English
// Wikipedia article "Limbo (video game)" (Gameplay + Plot only; user-chosen source for this page).
// Usage: node scripts/import_wikipedia_overview.mjs [--offline]   (--offline reuses the saved snapshot)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = join(ROOT, "raw-sources", "wikipedia", "limbo-video-game.json");
const OUT = join(ROOT, "canonical-sources", "sections", "game-overview.json");
const PAGE_URL = "https://en.wikipedia.org/wiki/Limbo_(video_game)";
const API = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts%7Crevisions&explaintext=1" +
  "&rvprop=ids%7Ctimestamp&titles=Limbo_(video_game)&format=json&formatversion=2";

let fetchMethod = "api";
if (process.argv.includes("--offline") && existsSync(SNAPSHOT)) {
  fetchMethod = "snapshot";
} else {
  const res = await fetch(API, { headers: { "User-Agent": "limbo-guide/1.0 (static guide builder)" } });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify(await res.json(), null, 2) + "\n", "utf8");
}

const page = JSON.parse(readFileSync(SNAPSHOT, "utf8")).query.pages[0];
const rev = page.revisions[0];

/** Text between "== Name ==" and the next level-2 heading, paragraphs separated by a blank line. */
function sectionText(name) {
  const m = new RegExp(`^==\\s*${name}\\s*==\\s*$([\\s\\S]*?)(?=^==[^=]|(?![\\s\\S]))`, "m").exec(page.extract);
  if (!m) throw new Error(`Wikipedia section not found: ${name}`);
  return m[1].split("\n").map((l) => l.trimEnd()).filter(Boolean).join("\n\n");
}

const blocks = [
  { title: "Gameplay", format: "prose", text: sectionText("Gameplay") },
  { title: "Plot", format: "prose", spoiler: true, text: sectionText("Plot") },
];

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const canonical = {
  id: "game-overview", code: "", title: "Game Overview", type: "reference", category: "Introduction",
  source: {
    game: "Limbo",
    author: "Wikipedia contributors (CC BY-SA 4.0)",
    version: `revision ${rev.revid}`,
    url: PAGE_URL,
    source_file: "raw-sources/wikipedia/limbo-video-game.json",
    source_url: PAGE_URL,
    fetched: new Date().toISOString().slice(0, 10),
    fetch_method: fetchMethod === "snapshot" ? (prev.source?.fetch_method ?? "api") : "api",
    sections: ["Gameplay", "Plot"],
    license: "CC BY-SA 4.0",
  },
  navigation: prev.navigation ?? { prev: null, next: null },
  blocks,
  text: blocks.map((b) => b.text).join(""),
};
writeFileSync(OUT, JSON.stringify(canonical, null, 2) + "\n", "utf8");
console.log(`wrote ${OUT} (revision ${rev.revid}, ${canonical.text.length} chars)`);
