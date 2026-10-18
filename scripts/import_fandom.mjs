// import_fandom.mjs - Fetch the Limbo wiki walkthrough via the MediaWiki API into raw-sources/fandom/.
// Usage: node scripts/import_fandom.mjs   (index page + every chapter it lists, nothing else)

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "./status.mjs";

const API = "https://limbo.fandom.com/api.php";
const OUT = join(ROOT_DIR, "raw-sources", "fandom");
const UA = "limbo-guide-importer (personal guide project)";

async function fetchPage(title) {
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext%7Crevid&redirects=1&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  const j = await res.json();
  if (!j.parse) throw new Error(`${title}: ${JSON.stringify(j.error ?? j).slice(0, 200)}`);
  return { title: j.parse.title, revid: j.parse.revid, wikitext: j.parse.wikitext["*"] };
}

const slugOf = (t) => t.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

mkdirSync(OUT, { recursive: true });
const index = await fetchPage("Walkthrough");
const fetched = new Date().toISOString().slice(0, 10);
const chapters = [...index.wikitext.matchAll(/^#\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gm)]
  .map((m, i) => ({ n: i + 1, page: m[1].trim(), label: (m[2] ?? m[1]).trim() }));
writeFileSync(join(OUT, "_index.json"), JSON.stringify({ ...index, fetched, method: "api", chapters }, null, 2));
console.log(`index rev ${index.revid}: ${chapters.length} chapters`);
for (const ch of chapters) {
  const p = await fetchPage(ch.page);
  const slug = slugOf(ch.label);
  writeFileSync(join(OUT, `${String(ch.n).padStart(2, "0")}-${slug}.json`),
    JSON.stringify({ ...p, n: ch.n, slug, label: ch.label, fetched, method: "api",
      url: `https://limbo.fandom.com/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}` }, null, 2));
  console.log(`${ch.n} ${slug} (${p.wikitext.length} chars)`);
  await new Promise((r) => setTimeout(r, 300));
}
