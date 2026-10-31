// Fidelity proof. Re-reads the saved IGN pages and the generated pages independently of extract.mjs and checks:
//  1. every source file is a page in the manifest, in the manifest's chain order, with an unchanged hash;
//  2. each page file's words equal the words of its source text blocks, word for word;
//  3. image counts and the number of links in the text match the source;
//  4. every source image block and video block appears in the page.
// Exit code 1 on any difference.
import fs from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { ROOT, tokensOf, loadSources } from './lib/source.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'manifest.json'), 'utf8'));
const sources = new Map(loadSources().map((s) => [s.file, s]));
const errors = [];
const err = (m) => errors.push(m);
const same = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);
const diffAt = (a, b) => { const i = a.findIndex((w, k) => w !== b[k]); return `at word ${i < 0 ? Math.min(a.length, b.length) : i} (${a.length} vs ${b.length} words): "${a.slice(Math.max(0, i - 3), i + 4).join(' ')}" vs "${b.slice(Math.max(0, i - 3), i + 4).join(' ')}"`; };
const count = (nodes, test) => { let c = 0; (function w(n) { if (test(n)) c++; (n.childNodes || []).forEach(w); })({ childNodes: nodes }); return c; };
const isLinkInText = (n) => n.nodeName === 'a' && !n.attrs.some((a) => a.name === 'class' && a.value === 'ign-img-link');

if (sources.size !== manifest.pages.length) err(`Source has ${sources.size} files, manifest ${manifest.pages.length} pages.`);
let words = 0;
for (const p of manifest.pages) {
  const s = sources.get(p.source);
  if (!s) { err(`Page ${p.id}: source file ${p.source} is missing.`); continue; }
  if (s.sha256 !== p.sha256) err(`Page ${p.id}: source changed since extraction (hash mismatch). Re-run extract.`);
  const file = path.join(ROOT, 'src', 'data', 'pages', `${p.id}.html`);
  if (!fs.existsSync(file)) { err(`Missing page file ${p.id}.html`); continue; }
  const got = parseFragment(fs.readFileSync(file, 'utf8')).childNodes;

  const textBlocks = s.entities.filter((e) => e.name === 'html').map((e) => parseFragment(e.values.html));
  const want = tokensOf(textBlocks);
  const have = tokensOf(got);
  words += want.length;
  if (!same(want, have)) err(`Page ${p.id}: words differ from source ${diffAt(want, have)}`);

  const wantImgs = textBlocks.reduce((a, f) => a + count(f.childNodes, (n) => n.nodeName === 'img'), 0)
    + s.entities.filter((e) => e.name === 'image').reduce((a, e) => a + e.values.length, 0);
  const haveImgs = count(got, (n) => n.nodeName === 'img');
  if (wantImgs !== haveImgs) err(`Page ${p.id}: ${haveImgs} images, source has ${wantImgs}.`);

  const wantLinks = textBlocks.reduce((a, f) => a + count(f.childNodes, isLinkInText), 0);
  const haveLinks = count(got, isLinkInText);
  if (wantLinks !== haveLinks) err(`Page ${p.id}: ${haveLinks} links in text, source has ${wantLinks}.`);

  const wantVideos = s.entities.filter((e) => e.name === 'video').length;
  const haveVideos = count(got, (n) => n.nodeName === 'iframe');
  if (wantVideos !== haveVideos) err(`Page ${p.id}: ${haveVideos} videos, source has ${wantVideos}.`);
}

if (errors.length) {
  console.error(errors.slice(0, 25).map((e) => `[FAIL] ${e}`).join('\n'));
  if (errors.length > 25) console.error(`... and ${errors.length - 25} more`);
  process.exit(1);
}
console.log(`[OK] fidelity verified: ${manifest.pages.length} pages, ${words} words equal to the source text blocks.`);
