# Limbo guide - project spec

Status: draft. Items marked **[USER]** wait for the user. Nothing here is converted yet.

## 1. Goal
A static, player-friendly Limbo walkthrough built with the same pipeline as `shadow-hearts-guide`:
`Source -> Canonical Source -> Structured Guide JSON -> Static Page -> QA -> GitHub Pages`.
Each chapter page shows the chapter's embedded video plus the wiki text, as a tickable checklist.
Layout and controller support are inherited unchanged (see `TEMPLATE.md`).

## 2. Sources **[USER]**
The user selects and saves the sources; the agent never searches for or picks them.

| Item | Needed from the user |
| :-- | :-- |
| Wiki chapter pages | Saved HTML files in `raw-sources/`, one per chapter (or the one page that holds all chapters) |
| Wiki egg / collectible page(s) | Saved HTML in `raw-sources/` |
| Wiki achievements page | Saved HTML in `raw-sources/` (if wanted) |
| Chapter videos | One URL per chapter (YouTube preferred), plus optional start time |
| Licence / permission | Confirm the wiki licence and that embedding the videos is allowed before publishing |

The importer (`.claude/skills/source-importer/SKILL.md`) still describes the GameFAQs ASCII source.
It gets a wiki-HTML profile once the first saved page exists, so the profile matches a real file.

## 3. Pages and routes
Human-readable wiki-style slugs, not `w-1-01` codes. Route is `/guide/<slug>`; the slug is `guide.id`
(schema pattern `^[a-z0-9-]+$`). Proposed set, to be confirmed against the wiki's chapter list:

| Slug (example) | Type | Category |
| :-- | :-- | :-- |
| `game-overview` | `reference` | Introduction |
| `the-forest`, `the-hotel`, ... | `walkthrough` | Chapters |
| `hidden-eggs` | `reference` | Collectibles |
| `achievements` | `reference` | Collectibles |

- Order comes from `navigation.prev/next` (the sidebar and `/contents` follow that chain).
- Consecutive sections with the same `category` form one sidebar group.
- `code` is optional and unused.
- Filenames: `structured-content/sections/<slug>.json`; canonical: `canonical-sources/sections/<slug>.json`.

## 4. Video authority rule
- The **wiki text is the only source checked for fidelity**.
- The video is embedded and linked as the chapter's source (`source.video_url`); it is not a fact source.
- A fact that exists only in the video is not transcribed. It is flagged as a note (`type: "discrepancy"` or a
  `callout`) for the user to decide, per CLAUDE.md section 1.
- QA ignores `guide.video`; it checks the text fields against the canonical wiki text only.

## 5. Schema deltas (additive, added when the pilot needs them)
1. `guide.video`: `{ url, embed_id, start?, title? }`, optional. Rendered by a new `VideoEmbed.astro`
   (lazy-loaded `youtube-nocookie` iframe, plain link as fallback). Touches the guide schema,
   `docs/structured-schema.md`, `types.ts`, `[id].astro`, `buildPageTocSections` (anchor `video`).
2. `guide.collectibles[]`: `{ name, location, missable, condition? }`, optional. Rendered as a tickable checklist
   in the same style as `StepChecklist`, with a page-TOC anchor `collectibles`.
3. Puzzles use the existing step `type: "puzzle"`; no new step type.
4. RPG fields (`bosses`, `shops`, `enemies`, `items_summary`) stay in the schema but are never emitted.
   `BossCard` is kept only because `StepChecklist` imports it; remove it together with that import if unused after the pilot.

## 6. Scripts keyed on id prefixes (fix before the first `check`)
These decide behaviour from `w-` / `a-1-` and must switch to the section `type`
(`walkthrough` / `sidequest` = walkthrough path; `reference` = verbatim path):
- `scripts/pipeline.mjs` (3 sites: walkthrough-only checks, subagent-QA reminder, verdict check)
- `scripts/guide.mjs` (lint-all file filter), `scripts/bold_terms.mjs` (section filter)
- `.claude/skills/guide-transformer/scripts/scaffold_structured_guide.mjs` (reference detection)
- `.claude/skills/qa/scripts/verify_guide.mjs` (verbatim-reference detection)
The canonical index needs a `type` per section (set by the importer).

## 7. Text rules
- Keep the 3+ sentences / ~40+ words -> bullet-list rule and the lint. Revisit only if the pilot shows terse puzzle
  text becoming one-word bullets.
- Controls: Limbo needs few button prompts; the PS2 glyph map in `src/lib/markup.ts` stays until the pilot shows
  which keyboard/Xbox tokens the wiki text uses.

## 8. Pilot (3 chapters) and exit criteria
Pick one wiki-only chapter, one with a video, one with an egg. Per chapter:
`import -> scaffold -> refine -> node scripts/guide.mjs check <slug> -> qa-prompt -> subagent -> verdict -> finalize`.
Also seed 3-5 deliberate errors in one pilot chapter and confirm QA catches them.
Done when: all 3 pass `check`, subagent verdicts recorded, seeded errors caught, the video embed and collectible
checklist render at desktop and mobile width, and gamepad navigation still reaches the new blocks.

## 9. Open questions **[USER]**
1. Which wiki, and which of its pages are the chapter list and the egg list?
2. One video per chapter, or one full-game video with chapter timestamps?
3. Should achievements get a page?
4. Site URL: keep `https://ronwindy.github.io/limbo-guide`? Logo and favicon art to use (currently a text placeholder `public/logo.svg`)?
