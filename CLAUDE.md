# Limbo Guide — Agent Instructions

A static guide (Astro, GitHub Pages) for Limbo. The page text lives in `src/data/pages/*.html` (originally adapted from the IGN wiki walkthrough) and is **now our own, hand-editable content**. `src/data/manifest.json` lists the pages for the sidebar and contents.

## Rules
- The text is the user's. Edit wording, structure or images **only when asked**; otherwise leave it alone. Do not rewrite, summarise, reorder or "fix" text on your own initiative.
- There is no longer a verbatim-to-source requirement and no extract/verify pipeline. Edit `src/data/pages/*.html` directly; git history is the record.
- The user chooses all sources; never search for or pick them. Extra research is only done when explicitly requested.
- Priority when rules conflict: **user requirements > usability > visual polish > convenience.**
- Commit directly on `main`. Ask before adding new components or dependencies.
- Browser verification (preview server, screenshots) is only for complex UI changes. For simple changes (a CSS tweak, width/alignment, swapping an image, a text edit) skip it; the user checks those themselves. A build is enough.
- Render-time presentation (CSS, layout, sidebar, icons, box/table styling, inline `style` stripping, heading ids, callout wrapping in `src/lib/guideData.ts`) still applies on top of the page HTML.
- Design decisions live in [`DESIGN.md`](DESIGN.md).

## Workflow
```bash
npm run build     # Astro build
```
- Windows: run npm via `cmd /c npm run <script>`. Node only, no Python.
- Some links in the page HTML still point to ign.com where the target page was never saved locally; edit them as needed.

## Scope
Progress is page-level only (Mark as read, sidebar/contents ticks, Continue button) in `localStorage` key `limbo-read`. Out of scope: per-step checklists, crawling, backends.
