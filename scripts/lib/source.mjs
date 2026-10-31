// Shared helpers for reading the saved IGN wiki pages. Used by extract.mjs and verify.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'));

export const attr = (n, k) => n.attrs?.find((a) => a.name === k)?.value;

/** Visible text of a node. <br> counts as a space; scripts/styles/comments carry no text. */
export function textOf(n) {
  if (n.nodeName === '#text') return n.value;
  if (n.nodeName === 'br') return ' ';
  if (n.nodeName === '#comment' || n.nodeName === 'script' || n.nodeName === 'style') return '';
  return (n.childNodes || []).map(textOf).join('');
}

/** Word tokens of a list of nodes; the word-by-word comparison unit. */
export const tokensOf = (nodes) => nodes.map(textOf).join(' ').split(/\s+/).filter(Boolean);

/**
 * Reads every saved IGN page in the source folder. The wiki content of each page is the structured
 * `htmlEntities` list inside its Next.js `__NEXT_DATA__` JSON; everything else in the file is site chrome.
 */
export function loadSources() {
  const dir = path.join(ROOT, config.extract.sourceDir);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort() : [];
  if (!files.length) throw new Error(`No .html files in ${config.extract.sourceDir}/.`);
  return files.map((file) => {
    const buf = fs.readFileSync(path.join(dir, file));
    const m = buf.toString('utf8').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error(`${file}: no __NEXT_DATA__ block.`);
    const wiki = JSON.parse(m[1]).props.pageProps.page;
    const page = wiki.page;
    return {
      file,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      bytes: buf.length,
      title: page.title,
      slug: wiki.chapter || '',
      next: page.nextPage?.url ?? null,
      prev: page.prevPage?.url ?? null,
      entities: page.htmlEntities.map((e) => ({ name: e.name, values: e.values })),
      checklistTasks: page.checklistTasks?.length ?? 0,
    };
  });
}

export const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
