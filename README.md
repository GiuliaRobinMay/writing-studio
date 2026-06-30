# Big Tribe Builders — Writing Studio

A private, single-author writing environment for the book *Big Tribe Builders*.
This is **v1 (the core writing studio)**: book overview + status system, a
markdown/rich-text editor per section, and a typeset, paginated reader mode with
real page counts. Local-first — everything persists to your browser's IndexedDB,
so it works offline and needs no backend.

## Running it

This repo ships with a project-local Node runtime expectation but no global
Node. If you used the bundled local Node, put it on your PATH first:

```bash
export PATH="$HOME/.local/node-current/bin:$PATH"
```

Then:

```bash
npm install
npm run dev      # starts Vite on http://localhost:5273
```

Build a static bundle:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the built bundle
```

## What's here (build order steps 1–3)

- **Overview** (`/`) — all 15 chapters with the locked 7+1 template, status
  chips (six states), live word counts, estimated pages, a completion bar,
  status filtering, expand-to-sections, and drag-to-reorder chapters.
- **Editor** (`/chapter/:id`) — a TipTap editor per section, editable printed
  titles, per-section + per-chapter status and word count, a jump rail, and
  prev/next chapter navigation. Autosaves to IndexedDB.
- **Reader** (`/read`, `/read/:id`) — distraction-free, fully typeset pages in
  the house style (Georgia, brown `#8B5A3C`, justified, drop caps, running
  heads, **real page breaks and page numbers**). Page count comes from genuine
  in-browser measurement, not an estimate.

## Data model

`src/types.ts` — Book → Chapter → Section, plus the six-state `Status` and the
eight `PartType`s of the locked chapter template. Seed content lives in
`src/data/seed.ts` (real titles/taglines + on-theme placeholder prose). State
and persistence: `src/store/useBookStore.ts`.

## Not yet built (later milestones from the spec)

Annotations/margin notes & images · references manager · voice/settings ·
BIG TRIBE BRAIN pull/push · AI-assisted drafting (with the §5 integrity
guardrails) · PDF/Word export. The data model and house style were built to
extend into these without rework.

## Reset

The studio loads seed content on first run and then persists your edits. To wipe
local data and reload the seed, clear the site's IndexedDB (key
`big-tribe-builders`) in your browser dev tools, or call `resetToSeed()` from the
store.
