# Limbo Guide — Agent Instructions

A static guide (Astro, GitHub Pages) for Limbo. The text is the IGN wiki walkthrough, shown **verbatim**; only the presentation is ours.

```text
raw-sources/ign/*.html (gitignored, user-saved IGN pages)
  → scripts/extract.mjs  → src/data/pages/*.html + src/data/manifest.json (committed, never hand-edited)
  → scripts/verify.mjs   (independent re-parse, word-for-word equality)
  → Astro build (set:html)
```

## Rules
- The IGN text is the sole authority. Never rewrite, summarise, reorder, bold, rename or "fix" it. Typos and oddities in the source stay.
- The user chooses all sources; never search for or pick them. Extra research is only done when explicitly requested and is kept visibly separate.
- Priority when rules conflict: **source fidelity > user requirements > usability > visual polish > convenience.**
- Commit directly on `main`. Ask before adding new components or dependencies.
- Browser verification (preview server, screenshots) is only for complex UI changes. For simple changes (a CSS tweak, width/alignment, swapping an image) skip it; the user checks those themselves. A build is enough.
- Allowed presentation work (render time only, text untouched): CSS, layout, sidebar, icons, styling of IGN's own boxes/tables/rows, hiding the duplicate "Chapter NN" label, stripping inline `style` attributes, adding heading ids for the on-page contents.
- Design decisions live in [`DESIGN.md`](DESIGN.md). Everything not carried over from the source is listed in [`docs/extract-report.md`](docs/extract-report.md).

## Workflow
```bash
npm run sync      # extract + verify (needs raw-sources/ign/ locally; CI only builds from the committed src/data)
npm run build     # Astro build
```
- Windows: run npm via `cmd /c npm run <script>`. Node only, no Python.
- If the source pages change, re-run `sync`; never edit `src/data/` by hand.
- Link handling: IGN wiki links are rewritten to local pages when the target was saved; otherwise they point to ign.com (see the report).

## Scope
Progress is page-level only (Mark as read, sidebar/contents ticks, Continue button) in `localStorage` key `limbo-read`. Out of scope: per-step checklists, restructuring or summarising text, crawling, backends, game facts from outside the source.
