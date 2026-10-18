# Limbo guide - project spec

Status: pilot done (Awakening, Lake Passage, Bear Traps). Items marked **[USER]** wait for the user.

## 1. Goal
A static, player-friendly Limbo walkthrough built with the same pipeline as `shadow-hearts-guide`:
`Source -> Canonical Source -> Structured Guide JSON -> Static Page -> QA -> GitHub Pages`.
Each chapter page shows the wiki text as a tickable checklist plus its traps list.
Layout and controller support are inherited unchanged (see `TEMPLATE.md`).

## 2. Source (chosen by the user)
`https://limbo.fandom.com/wiki/Walkthrough`: an index of 40 chapters, each on its own wiki page.
Fandom blocks plain page fetches (HTTP 403/402), so the text is fetched through the MediaWiki API
(`api.php?action=parse&prop=wikitext`), method `api`.

| Step | Script / output |
| :-- | :-- |
| Fetch index + 40 chapters | `node scripts/import_fandom.mjs` -> `raw-sources/fandom/*.json` (title, revision id, wikitext, fetch date) |
| Build canonical | `node scripts/build_canonical_fandom.mjs` -> `canonical-sources/` (manifest + `sections/<slug>.json`) |

Canonical text is the wikitext with markup stripped only (tables, `[[File:]]`, `{{templates}}`, link/bold/italic
markup); wording, order and oddities (typos, an unbulleted list line) are kept verbatim. Chapter pages may also
carry `Hidden Egg` (Awakening) and `Trivia` (Electric Letters) headings; they stay in the text.
**[USER]** Before publishing: confirm the wiki's licence (Fandom text is normally CC BY-SA) and add attribution.

## 3. Pages and routes
Route is `/guide/<slug>`; slug = `guide.id` (`^[a-z0-9-]+$`), from the wiki's chapter label.

| Slug | Type | Category |
| :-- | :-- | :-- |
| `game-overview` | `reference` | Introduction (index intro text) |
| `awakening` ... `end-of-the-journey` (40) | `walkthrough` | Chapters |

- Order comes from `navigation.prev/next` (overview -> chapter 1 -> ... -> chapter 40).
- `code` is empty and unused. Filenames: `structured-content/sections/<slug>.json`; canonical: `canonical-sources/sections/<slug>.json`.
- The canonical manifest and each canonical section carry `type`; scripts key behavior on it (see `CLAUDE.md`).
- No achievements or egg pages: no sources were given. The one egg the wiki mentions (Awakening) is a callout.

## 3b. Images (pilot: awakening, lake-passage, bear-traps)
The wikitext's `[[File:]]` references are kept as canonical `images[]` (`file`, `caption`, `after` = heading above it); the canonical
`text` still omits them. `node scripts/import_images.mjs [slug ...]` downloads the files via the API (`imageinfo`) into `public/images/`
and records source URL / licence metadata in `raw-sources/fandom/_images.json`; run it before `build_canonical_fandom.mjs`
(only downloaded files become `images[]`). Images are illustrations only, not a fact source. Extending beyond the pilot = run the
import for more slugs, rebuild the canonical, patch `images` into those sections.
**[USER]** The wiki returned no licence metadata for these files; check licensing/attribution before publishing.

## 4. Video
Dropped for now (decision: wiki text only). `guide.video` / `VideoEmbed` are not built. If added later, the video is
an embed plus source link and is never fact-checked.

## 5. Schema deltas
1. `guide.traps`: `string[]`, optional. The wiki's "Traps and obstacles" bullets, verbatim. Rendered by
   `TrapsList.astro` as a collapsible section (open by default, id `traps`, after the steps) and in the page TOC.
   QA (`verify_guide.mjs`) requires every canonical trap and rejects extra ones.
2. Everything else uses existing fields: Hidden Egg and wiki side remarks become `callouts` (`tip`, `lore`,
   `discrepancy`); puzzles use step `type: "puzzle"`.
3. RPG fields (`bosses`, `shops`, `enemies`, `items_summary`) stay in the schema but are never emitted.

## 6. Scripts keyed on id prefixes (DONE)
Behavior comes from the section `type` (`sectionType` / `isWalkthroughType` in `scripts/sections.mjs`).
`bold_terms.mjs` no longer mines appendices; with an empty `term_extras.json` it bolds nothing.

## 7. Text rules
- Keep the 3+ sentences / ~40+ words -> bullet-list rule and the lint.
- Wiki typos and odd wording are kept (`corpse: it seems to be not be human ...`), never corrected. The lint flags a
  lowercase-start line, so such a remark gets a short lead-in ("Source remark, kept as written - ...").
- A source line that breaks the page's own pattern (the unbulleted "Dead corpse" under Traps) is preserved in the
  canonical text, left out of `traps`, and flagged with a `discrepancy` callout.
- Controls: the chapter text needs no button glyphs; the PS2 glyph map in `src/lib/markup.ts` stays for now.

## 8. Pilot: Awakening, Lake Passage, Bear Traps
Per chapter: `import -> structure -> node scripts/guide.mjs check <slug> -> qa-prompt -> subagent -> verdict -> finalize`.
Result:
- All 3 pass `check`; subagent verdicts: Awakening PASS_WITH_NOTES (the intro sentence "X is the 1st chapter ... followed
  by Y" is carried by navigation only), Lake Passage PASS, Bear Traps PASS_WITH_NOTES (unbulleted line is flagged).
- Seeded errors (Bear Traps copy: "two" -> "three", a dropped step line, an invented "and save your game", a changed
  trap, a wrong next id): script QA caught 4 of 5 (it missed the invented clause); an independent subagent caught all 5.
- Traps section renders at desktop and 375px width, no horizontal overflow, the section toggle works, no console errors,
  and `main section[id]` (the gamepad hook) includes it.
- The 3 chapters were written by hand into JSON; the scaffold only produced a poor draft for plain wiki prose
  (traps leaked into steps, steps typed by guess). Scaling to 40 needs a Limbo-specific scaffold (see the review).

## 9. Open questions **[USER]**
1. Licence / attribution wording for the footer.
2. Site URL: keep `https://ronwindy.github.io/limbo-guide`? Logo and favicon art (currently a text placeholder `public/logo.svg`)?
3. Remaining 37 chapters and the overview page: convert after the pilot review.
4. Breadcrumb shows "Chapters / Chapters / <title>" (link label plus category); rename one?
