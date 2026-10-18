// build_canonical_fandom.mjs - Build canonical-sources/ from raw-sources/fandom/ (output of import_fandom.mjs).
// Deterministic markup stripping only: wording, order and numbers are kept verbatim.
// Removed from the text: infobox/navigation tables, [[File:]] images, {{templates}}, <br>.
// Images that were downloaded (import_images.mjs) are kept as `images[]` {file, caption, after}. Links/bold/italics lose their markup.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "./status.mjs";
import { PROJECT } from "./project_config.mjs";
import { imagesOf, localName } from "./wiki_images.mjs";
import { existsSync } from "node:fs";

const RAW = join(ROOT_DIR, "raw-sources", "fandom");
const OUT = join(ROOT_DIR, "canonical-sources");
const index = JSON.parse(readFileSync(join(RAW, "_index.json"), "utf8"));

function clean(w) {
  return w
    .replace(/\{\|[\s\S]*?\|\}/g, "")
    .replace(/\[\[File:[^\]]*\]\]/gi, "")
    .replace(/\{\{[^}]*\}\}/g, (m) => (/^\{\{PAGENAME\}\}$/i.test(m) ? m : ""))
    .replace(/<br\s*\/?>/gi, "")
    .replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''''([^']+)'''''/g, "$1")
    .replace(/'''([^']+)'''/g, "$1")
    .replace(/''([^']+)''/g, "$1")
    .replace(/\r/g, "")
    .split("\n").map((l) => l.replace(/\s+$/, "")).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toText(w, title) {
  const body = clean(w).replace(/\{\{PAGENAME\}\}/gi, title);
  return body
    .replace(/^=+\s*(.*?)\s*=+\s*$/gm, "\n$1\n")
    .replace(/^\*\s*/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trapsOf(w) {
  const m = /^=+\s*Traps and obstacles\s*=+\s*$([\s\S]*?)(?=^=+\s*\S|\{\{walkthrough\}\}|(?![\s\S]))/im.exec(w);
  if (!m) return [];
  return clean(m[1]).split("\n").filter((l) => /^\*/.test(l)).map((l) => l.replace(/^\*\s*/, "").trim());
}

/** images[] for the references whose file was downloaded to public/images/. */
function imagesField(w) {
  const images = imagesOf(w).filter((i) => existsSync(join(ROOT_DIR, "public", "images", localName(i.name))))
    .map((i) => ({ file: `images/${localName(i.name)}`, caption: i.caption, after: i.after }));
  return images.length ? { images } : {};
}

const files = readdirSync(RAW).filter((f) => /^\d/.test(f)).sort();
const pages = files.map((f) => JSON.parse(readFileSync(join(RAW, f), "utf8")));
const source = (p) => ({ game: PROJECT.game, author: "Limbo Wiki (Fandom) contributors", version: `revision ${p.revid}`,
  url: p.url ?? "https://limbo.fandom.com/wiki/Walkthrough", source_file: p.file ?? "", source_url: p.url ?? "https://limbo.fandom.com/wiki/Walkthrough", fetched: index.fetched, fetch_method: index.method });
const link = (id, title) => ({ id, code: "", title, file: `sections/${id}.json` });

// game-overview now comes from Wikipedia (scripts/import_wikipedia_overview.mjs); keep it, refresh only navigation.
const OVERVIEW_FILE = join(OUT, "sections", "game-overview.json");
const keptOverview = existsSync(OVERVIEW_FILE) ? JSON.parse(readFileSync(OVERVIEW_FILE, "utf8")) : null;
const fandomOverview = {
  id: "game-overview", code: "", title: "Game Overview", type: "reference", category: "Introduction",
  source: { ...source({ revid: index.revid, url: "https://limbo.fandom.com/wiki/Walkthrough", file: "raw-sources/fandom/_index.json" }) },
  navigation: { prev: null, next: link(pages[0].slug, pages[0].label) },
  text: toText(index.wikitext.split(/^==\s*Chapters\s*==/m)[0], "Walkthrough") + "\n\nChapters\n" +
    toText(index.wikitext.split(/^==\s*Chapters\s*==/m)[1].split(/^#/m)[0], "Walkthrough"),
};
const overview = keptOverview?.source?.url?.includes("wikipedia.org")
  ? { ...keptOverview, navigation: { prev: null, next: link(pages[0].slug, pages[0].label) } }
  : fandomOverview;
const sections = [overview];
pages.forEach((p, i) => {
  const text = toText(p.wikitext, p.title);
  sections.push({
    id: p.slug, code: "", title: p.label, type: "walkthrough", category: "Chapters",
    chapter: p.n, wiki_page: p.title,
    source: source({ ...p, file: `raw-sources/fandom/${files[i]}` }),
    navigation: {
      prev: link(i === 0 ? overview.id : pages[i - 1].slug, i === 0 ? overview.title : pages[i - 1].label),
      next: i === pages.length - 1 ? null : link(pages[i + 1].slug, pages[i + 1].label),
    },
    traps: trapsOf(p.wikitext),
    ...imagesField(p.wikitext),
    text,
  });
});
sections[1].navigation.prev = link(overview.id, overview.title);

mkdirSync(join(OUT, "sections"), { recursive: true });
for (const s of sections) writeFileSync(join(OUT, "sections", `${s.id}.json`), JSON.stringify(s, null, 2) + "\n");
writeFileSync(join(OUT, PROJECT.canonicalIndexFile), JSON.stringify({
  source: { game: PROJECT.game, url: "https://limbo.fandom.com/wiki/Walkthrough", fetched: index.fetched, method: index.method },
  sections_index: sections.map((s) => ({ id: s.id, code: s.code, title: s.title, type: s.type, category: s.category, file: `sections/${s.id}.json` })),
}, null, 2) + "\n");
console.log(`wrote ${sections.length} canonical sections`);
