// import_images.mjs - Download the wiki images referenced by raw-sources/fandom/*.json into public/images/.
// Usage: node scripts/import_images.mjs [slug ...]   (no slugs = every chapter). Writes raw-sources/fandom/_images.json
// (source URL, size and licence metadata per file) so the canonical builder and attribution have a record.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "./status.mjs";
import { imagesOf, localName } from "./wiki_images.mjs";

const API = "https://limbo.fandom.com/api.php";
const RAW = join(ROOT_DIR, "raw-sources", "fandom");
const OUT = join(ROOT_DIR, "public", "images");
const UA = "limbo-guide-importer (personal guide project)";
const only = process.argv.slice(2);

const pages = readdirSync(RAW).filter((f) => /^\d/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(RAW, f), "utf8")))
  .filter((p) => !only.length || only.includes(p.slug));
const names = [...new Set(pages.flatMap((p) => imagesOf(p.wikitext).map((i) => i.name)))];

mkdirSync(OUT, { recursive: true });
const metaPath = join(RAW, "_images.json");
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
const plain = (s) => (s ?? "").replace(/<[^>]*>/g, "").trim();

for (const name of names) {
  const q = `${API}?action=query&titles=${encodeURIComponent("File:" + name)}&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&format=json`;
  const j = await (await fetch(q, { headers: { "User-Agent": UA } })).json();
  const info = Object.values(j.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info) { console.log(`[FAIL] ${name}: no imageinfo`); continue; }
  const res = await fetch(info.url, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.log(`[FAIL] ${name}: HTTP ${res.status}`); continue; }
  writeFileSync(join(OUT, localName(name)), Buffer.from(await res.arrayBuffer()));
  const em = info.extmetadata ?? {};
  meta[name] = { file: `images/${localName(name)}`, url: info.url, width: info.width, height: info.height, mime: info.mime,
    description_page: `https://limbo.fandom.com/wiki/File:${encodeURIComponent(name)}`,
    license: plain(em.LicenseShortName?.value), artist: plain(em.Artist?.value), fetched: new Date().toISOString().slice(0, 10) };
  console.log(`ok ${name} ${info.width}x${info.height} ${meta[name].license || "(no licence metadata)"}`);
  await new Promise((r) => setTimeout(r, 300));
}
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
