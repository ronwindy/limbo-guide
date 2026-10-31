# Limbo Guide — Design

Strictly greyscale. Mood comes from fog, grain and vignette, hierarchy from contrast and shape, never colour.

- **Background:** fixed `public/background.png` (grayscale) under fog, grain and vignette layers (`BaseLayout.astro`, `global.css`).
- **Type:** Josefin Sans light, wide-tracked, for titles (`.gold-metal-text` = soft white glow, lowercase); Jost for body; Courier Prime for mono. Fonts load from Google Fonts.
- **Palette:** Tailwind chromatic palettes are remapped to a grey scale in `tailwind.config.mjs`; `gold-*` is a light-grey accent ramp.
- **Layout:** sticky left sidebar (collapsible, state in `sidebar-state`) with the logo and a reed-silhouette divider; mobile header with hamburger drawer; right-hand "On this page" list for pages with headings (xl screens); page title with a fading rule and reed ornament.
- **Homepage:** the table of contents (all guide pages grouped by category, read ticks, Begin/Continue button).
- **Guide body (`.guide-body`):** IGN markup restyled: white bold terms, hairline tables with scroll wrapper, notice boxes (`gh-red-box`, `gh-blue-box`), achievement rows (points badge, grey trophy dot), responsive image rows linking to the large image, 16:9 video embed.
- **Progress:** page-level only. "Mark as read" per page, tick marks in the sidebar and contents, Continue button on the homepage.
