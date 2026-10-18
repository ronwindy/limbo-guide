import fs from 'node:fs';
import path from 'node:path';
import type {
  TocEntry,
  TocCategory,
  TocData,
  PageTocItem,
  ManualOverviewData
} from './types';

export * from './types';

const SECTIONS_DIR = path.resolve(process.cwd(), 'structured-content/sections');
const CANONICAL_INDEX = path.resolve(process.cwd(), 'canonical-sources/limbo-guide.canonical.json');

/** Label shown on directory cards; the category is the generic fallback. */
export function getHumanReadableLabel(
  _rawCode: string = '',
  category: string = '',
  isSidequest: boolean = false
): string {
  if (category) return category;
  return isSidequest ? 'Side Quest' : '';
}

/**
 * Orders sections by following navigation.next from the section that has no prev.
 * Sections not on the chain keep filename order at the end.
 */
function orderByNavigation<T extends { id: string; data: any }>(items: T[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const hasPrev = (i: T) => !!i.data.guide?.navigation?.prev?.id && byId.has(i.data.guide.navigation.prev.id);
  const ordered: T[] = [];
  const seen = new Set<string>();
  for (const start of items.filter((i) => !hasPrev(i))) {
    let cur: T | undefined = start;
    while (cur && !seen.has(cur.id)) {
      ordered.push(cur);
      seen.add(cur.id);
      const nextId: string | undefined = cur.data.guide?.navigation?.next?.id;
      cur = nextId ? byId.get(nextId) : undefined;
    }
  }
  for (const i of items) if (!seen.has(i.id)) ordered.push(i);
  return ordered;
}

/**
 * Builds the sidebar / directory data (TocData shape) from the structured sections themselves.
 * Consecutive sections with the same `category` form one group.
 */
export function getTocData(): TocData {
  const structured = new Map(getAllStructuredSections().map((s) => [s.id, s]));
  // Canonical index gives the full chronological list; entries without a structured file stay unlinked.
  const entries: Array<{ id: string; code?: string; title: string; type?: string; category?: string }> =
    fs.existsSync(CANONICAL_INDEX)
      ? JSON.parse(fs.readFileSync(CANONICAL_INDEX, 'utf-8')).sections_index ?? []
      : [];
  const indexed = new Set(entries.map((e) => e.id));
  for (const sec of orderByNavigation([...structured.values()])) {
    if (indexed.has(sec.id)) continue;
    const g = sec.data.guide ?? {};
    entries.push({ id: sec.id, code: g.code, title: g.title, type: g.type, category: g.category });
  }

  const categories: TocCategory[] = [];
  for (const e of entries) {
    const g = structured.get(e.id)?.data.guide ?? {};
    const category = g.category || e.category || 'Guide';
    const type = g.type || e.type;
    let cat = categories[categories.length - 1];
    if (!cat || cat.category !== category) {
      cat = { category, entries: [] };
      categories.push(cat);
    }
    cat.entries.push({
      code: g.code || e.code || e.id,
      title: g.title || e.title || e.id,
      is_sidequest: type === 'sidequest',
      id: e.id,
      has_structured: structured.has(e.id),
      type,
      label: category
    });
  }
  return {
    guide: {
      id: 'contents',
      code: '',
      title: 'Contents',
      type: 'reference',
      category: 'Contents',
      source: { game: '', author: '', version: '', url: '', source_file: '' },
      navigation: {},
      overview: { sections: categories }
    }
  } as unknown as TocData;
}

export function getAllStructuredSections(): Array<{ id: string; filename: string; data: any }> {
  if (!fs.existsSync(SECTIONS_DIR)) return [];
  const files = fs.readdirSync(SECTIONS_DIR).filter((f: string) => f.endsWith('.json'));
  return files.map((filename: string) => {
    const filePath = path.join(SECTIONS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (data.guide?.overview?.sections) {
      enrichTocCategories(data.guide.overview.sections, files);
    }
    const id = data.guide?.id || filename.replace('.json', '');
    return { id, filename, data };
  });
}

/**
 * Builds the array of jump sections for on-page table of contents (right sidebar & mobile drawer)
 */
export function buildPageTocSections(guide: any): PageTocItem[] {
  const overview: ManualOverviewData = guide.overview || {};
  const objectives = guide.objectives || (overview.objective ? [overview.objective] : []);
  const route = guide.route || overview.route || [];
  const steps = guide.steps || [];
  const initialSetup = guide.initial_setup;

  const pageSections: PageTocItem[] = [];

  if (objectives && objectives.length > 0) {
    pageSections.push({ id: 'objectives', label: 'Primary Objectives', count: objectives.length });
  }
  if (route && route.length > 0) {
    pageSections.push({ id: 'route', label: 'Route Progression' });
  }
  if (guide.save_points && guide.save_points.length > 0) {
    pageSections.push({ id: 'save-points', label: 'Save Points', count: guide.save_points.length });
  }
  if (initialSetup) {
    pageSections.push({ id: 'setup', label: 'Initial Setup' });
  }
  if (steps && steps.length > 0) {
    pageSections.push({ id: 'steps', label: 'Walkthrough Steps', count: steps.length });
  }
  if (guide.traps && guide.traps.length > 0) {
    pageSections.push({ id: 'traps', label: 'Traps and Obstacles', count: guide.traps.length });
  }
  if (overview.story_prologue) {
    pageSections.push({ id: 'prologue', label: 'Story Prologue' });
  }
  if (overview.directions) {
    pageSections.push({ id: 'compass', label: 'Compass & Navigation' });
  }
  if (overview.controls) {
    pageSections.push({ id: 'controls', label: 'Controls' });
  }
  if (overview.playing_the_game) {
    pageSections.push({ id: 'system', label: 'System & Operations' });
  }
  if (overview.player_attributes) {
    pageSections.push({ id: 'attributes', label: 'Attributes & Battle' });
  }
  if (overview.battle_mechanics) {
    pageSections.push({ id: 'battle-mechanics', label: 'Battle Mechanics' });
  }
  if (overview.metadata) {
    pageSections.push({ id: 'metadata', label: 'Document Information' });
  }

  return pageSections;
}
