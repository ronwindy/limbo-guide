// Saved IGN wiki pages -> one verbatim HTML file per page in src/data/pages + manifest.json.
// No text is rewritten; only link targets change, tables get a scroll wrapper, and image/video
// entries are turned into <img>/<iframe> markup. Fails (exit 1) instead of guessing when the source
// does not match the expected shape.
import fs from 'node:fs';
import path from 'node:path';
import { parseFragment, serialize } from 'parse5';
import { ROOT, config, attr, tokensOf, loadSources, slugify } from './lib/source.mjs';

const cfg = config.extract;
const OUT = path.join(ROOT, 'src', 'data');
const fail = (msg) => { console.error(`[FAIL] ${msg}`); process.exit(1); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---- 1. Pages in IGN's own order: follow nextPage from the main page ----
const sources = loadSources();
const bySlug = new Map(sources.map((s) => [s.slug, s]));
const start = sources.find((s) => s.slug === '');
if (!start) fail('No main page (a source page with no chapter slug) to start the order from.');
const ordered = [];
for (let s = start; s && !ordered.includes(s); s = bySlug.get(s.next)) ordered.push(s);
const orphans = sources.filter((s) => !ordered.includes(s));
if (orphans.length) fail(`Pages not reachable from the main page by nextPage: ${orphans.map((s) => s.file).join(', ')}`);

const usedIds = new Set();
const pages = ordered.map((s) => {
  const category = cfg.categories.find((c) => new RegExp(c.match).test(s.slug))?.name;
  if (!category) fail(`${s.file}: no category matches slug "${s.slug}".`);
  let id = s.slug === '' ? cfg.homeId : slugify(s.slug);
  if (usedIds.has(id)) fail(`Duplicate page id ${id}.`);
  usedIds.add(id);
  return { id, title: s.slug === '' ? cfg.homeTitle : s.title, category, source: s };
});

// ---- 2. Link targets: IGN wiki URLs -> local pages ----
const byWikiSlug = new Map(pages.map((p) => [p.source.slug, p.id]));
const byTitle = new Map(pages.map((p) => [p.source.title, p.id]));
const WIKI = /^(?:https?:\/\/(?:www\.)?ign\.com)?\/wikis\/limbo(?:\/([^#?]*))?(#.*)?$/;
const unresolved = new Map();
let rewritten = 0;
function retarget(node, pageId) {
  if (node.nodeName === 'a') {
    const href = attr(node, 'href');
    const m = href && WIKI.exec(href);
    if (m) {
      const slug = decodeURIComponent(m[1] ?? '');
      const target = byWikiSlug.get(slug) ?? byTitle.get(attr(node, 'title')) ?? (slug === '' ? cfg.homeId : null);
      const a = node.attrs.find((x) => x.name === 'href');
      if (target) { a.value = `./${target}${m[2] ?? ''}`; rewritten++; }
      else {
        a.value = `https://www.ign.com${href.startsWith('/') ? '' : '/'}${href.replace(/^https?:\/\/(www\.)?ign\.com/, '')}`;
        unresolved.set(`${pageId}: ${href}`, true);
      }
    }
  }
  (node.childNodes || []).forEach((c) => retarget(c, pageId));
}

// ---- 3. Entities -> markup ----
const filename = (url) => decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
function entityHtml(e, pageId) {
  if (e.name === 'html') {
    const frag = parseFragment(e.values.html);
    retarget(frag, pageId);
    const html = serialize(frag);
    return e.values.tag === 'table' ? `<div class="table-wrap">${html}</div>` : html;
  }
  if (e.name === 'image') {
    const imgs = e.values.map((v) => `<a class="ign-img-link" href="${esc(v.modal?.src ?? v.original ?? v.src)}" target="_blank" rel="noopener"><img src="${esc(v.src)}" srcset="${esc(v.srcset)}" sizes="${esc(v.sizes)}" alt="${esc(filename(v.original ?? v.src))}" loading="lazy"></a>`);
    return `<figure class="ign-images">${imgs.join('')}</figure>`;
  }
  if (e.name === 'video') {
    const page = `https://www.ign.com/videos/${e.values.slug}`;
    return `<div class="video-embed"><iframe src="${cfg.videoEmbed}${encodeURIComponent(page)}" title="${esc(e.values.slug)}" loading="lazy" allowfullscreen></iframe></div>`;
  }
  fail(`${pageId}: unknown entity type "${e.name}".`);
}

fs.rmSync(path.join(OUT, 'pages'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
const counts = { html: 0, image: 0, video: 0 };
for (const p of pages) {
  const body = p.source.entities.map((e) => { counts[e.name]++; return entityHtml(e, p.id); }).join('\n');
  fs.writeFileSync(path.join(OUT, 'pages', `${p.id}.html`), body);
}

const manifest = {
  game: config.game,
  pages: pages.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    wikiSlug: p.source.slug,
    source: p.source.file,
    sha256: p.source.sha256,
    entities: p.source.entities.length,
  })),
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

// ---- 4. Report for the user: everything not carried over ----
const words = pages.reduce((a, p) => a + tokensOf(parseFragment(fs.readFileSync(path.join(OUT, 'pages', `${p.id}.html`), 'utf8')).childNodes).length, 0);
const tasks = pages.filter((p) => p.source.checklistTasks);
const lastPage = ordered[ordered.length - 1];
const report = `# Extraction report

Generated by \`node scripts/extract.mjs\`. Source: ${sources.length} saved IGN wiki pages in \`${cfg.sourceDir}/\` (${(sources.reduce((a, s) => a + s.bytes, 0) / 1e6).toFixed(1)} MB).

## Result
- Pages written: ${pages.length} (${counts.html} text blocks, ${counts.image} image blocks, ${counts.video} video blocks).
- Words kept in pages: ${words}. Every text block of every page is kept; nothing is summarised or reordered.
- Links rewritten to local pages: ${rewritten}. Unresolved (pointing at pages that were not saved; sent to ign.com): ${unresolved.size}.
${[...unresolved.keys()].map((u) => `  - ${u}`).join('\n')}
- Page order is IGN's own Next/Previous chain. The chain continues past \`${lastPage.file}\` to \`${lastPage.next ?? '(end)'}\`, which was not saved.
- Per-page checklist tasks in the source: ${tasks.length ? tasks.map((p) => `${p.id} (${p.source.checklistTasks})`).join(', ') : 'none'}.

## Not carried over
- IGN site chrome around the wiki content (navigation, ads, footer, scripts, styles), contributor lists, breadcrumbs and page metadata.
- Image blocks keep IGN's own hosted image addresses (not downloaded); each links to the large version.
- Video blocks (${counts.video}) only carry an IGN video slug. They are embedded through IGN's player at \`${cfg.videoEmbed}\`; this address is a best guess and should be checked in the browser.
- The home page text is kept as the Overview page, including IGN's "Contributor Assistance" notice.
`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'extract-report.md'), report);
console.log(`[OK] ${pages.length} pages, ${words} words, ${rewritten} links rewritten, ${unresolved.size} unresolved. Report: docs/extract-report.md`);
