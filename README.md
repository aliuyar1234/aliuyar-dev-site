# aliuyar.dev

Personal site of Ali Uyar: research on AI alignment, security and evaluation, plus essays. Static Astro site, deployed by Cloudflare Pages on every push to `main`.

## Stack

- Astro 5, static output, `trailingSlash: "always"` (Cloudflare serves pages as directories)
- Plain CSS with tokens in `src/styles/global.css`; Mona Sans (variable weight and width), self-hosted via Fontsource
- React only for two islands from React Bits: the hero headline (`VariableProximity`, hydrated on fine pointers only) and the 404 split-flap
- Anatomy figures: isometric SVG instruments built with the kit in `src/figures/kit/`

## Layout

```
src/content/research.json   papers: slug, title, short, theme, featured, finding, abstract, data-sheet fields, links
src/content/writing.json    essays (lines; "## " heading, "- " list item)
src/lib/                    site constants, paper and essay helpers
src/pages/                  home, research (+ one page per paper), articles, contact, 404, rss.xml
src/figures/<slug>/         one anatomy figure per folder: art.mjs (static SVG at build time), live.js (motion), Figure.astro
public/papers/              paper PDFs
public/og/                  generated Open Graph images
```

A paper gets its plate by adding `src/figures/<paper slug>/Figure.astro`; the paper page and its OG image pick it up automatically.

## Commands

```bash
npm install
npm run dev                  # http://localhost:4321
npm run build                # dist/
npm run og                   # regenerate public/og/*.png (headless Chrome)
node scripts/generate_favicons.mjs   # favicon.ico and PNGs from public/favicon.svg
npm run sync:research-pdfs   # pull paper PDFs from the linked GitHub repos
```

Figure previews and checks run from each figure folder: `node src/figures/<slug>/build.mjs` (add `--audit` where the figure has round parts or pipes).
