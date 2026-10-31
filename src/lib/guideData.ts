import fs from 'node:fs';
import path from 'node:path';

export interface PageEntry {
  id: string;
  title: string;
  category: string;
}

export interface TocCategory {
  category: string;
  entries: PageEntry[];
}

export interface PageHeading {
  id: string;
  label: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'src/data');

/** Pages in source order, as written by scripts/extract.mjs. */
export function getPages(): PageEntry[] {
  const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf-8'));
  return manifest.pages.map(({ id, title, category }: PageEntry) => ({ id, title, category }));
}

/** Verbatim page markup from the source. */
export function getPageHtml(id: string): string {
  return fs.readFileSync(path.join(DATA_DIR, 'pages', `${id}.html`), 'utf-8');
}

/** Drops inline style attributes (IGN floats and centres blocks) so the site theme controls layout. Text is untouched. */
export function stripInlineStyles(html: string): string {
  return html.replace(/\sstyle="[^"]*"/g, '');
}

/** Marks the "Chapter 01" label paragraph so CSS can hide it (the page title already shows it). Text is untouched. */
export function tagChapterLabel(html: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`<p>(${escaped})\\s*</p>`), '<p class="chapter-label">$1</p>');
}

/** Pages grouped by consecutive category, for the sidebar and contents page. */
export function getToc(): TocCategory[] {
  const categories: TocCategory[] = [];
  for (const page of getPages()) {
    let cat = categories[categories.length - 1];
    if (!cat || cat.category !== page.category) {
      cat = { category: page.category, entries: [] };
      categories.push(cat);
    }
    cat.entries.push(page);
  }
  return categories;
}

export function getNeighbours(id: string): { prev?: PageEntry; next?: PageEntry } {
  const pages = getPages();
  const at = pages.findIndex((p) => p.id === id);
  return at < 0 ? {} : { prev: pages[at - 1], next: pages[at + 1] };
}

/**
 * Gives every h2 (or h3, on pages without h2) an id (its own, or one derived from its text) and lists them for the
 * on-page contents. Returns the html with ids applied.
 */
export function withHeadingIds(html: string): { html: string; headings: PageHeading[] } {
  const headings: PageHeading[] = [];
  const tag = /<h2>/.test(html) ? 'h2' : 'h3';
  const out = html.replace(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'), (_m, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, '').replace(/&#x?[0-9a-f]+;|&\w+;/gi, ' ').replace(/\s+/g, ' ').trim();
    const id = `s-${headings.length + 1}`;
    headings.push({ id, label });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, headings };
}
