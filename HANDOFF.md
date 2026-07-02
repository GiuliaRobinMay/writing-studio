# Big Tribe Builders — Writing Studio · Handoff

A practical handoff for picking up this app in a fresh session (e.g. Martin on his own PC).
Last updated: 2026-07-02.

---

## 1. What this is

A private, single-author **book-authoring web app** ("Writing Studio", product name *Big Tribe
Builders*) for Giulia. It takes an author through the full arc — **Write → Read → Publish → Grow** —
and is being extended with AI drafting (Claude) and a retrieval "second brain" (BigQuery).

- **This is the software product**, not the giuliamay.com website or the BTB brand/band.
- It is currently **local-first**: all book data lives in the browser (IndexedDB). There are **no user
  accounts and no cloud sync yet** — that is the next major step (see §9).

---

## 2. Where everything lives

| Thing | Location |
|---|---|
| Source (Giulia's Mac) | `~/big-tribe-builders` |
| GitHub repo | `github.com/GiuliaRobinMay/writing-studio` (private, branch `main`) |
| Hosting | **Vercel** — scope `big-tribe-builders`, project `writing-studio` |
| Vercel project settings | `vercel.com/big-tribe-builders/writing-studio` |
| Live URL | Vercel **"Visit"** button on the project (e.g. `writing-studio-*.vercel.app`) |

**Deploys are automatic**: any push to `main` triggers a Vercel build + deploy (~1 min).

---

## 3. Running it locally

> ⚠️ This Mac has **no global Node / Homebrew**. Node 20.18.1 lives at `~/.local/node-current`.
> Every terminal session must put it on PATH first:

```bash
export PATH="$HOME/.local/node-current/bin:$PATH"
cd ~/big-tribe-builders
npm install          # first time only
npm run dev          # dev server → http://localhost:5273
```

Other scripts (from `package.json`):

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 5273) |
| `npm run build` | `tsc -b && vite build` → `dist/` (this is what Vercel runs) |
| `npm run preview` | Serve the production build locally |
| `npm run brain` | Run the local BIG TRIBE BRAIN proxy (port 5274) for dev |

On a **different machine** (Martin's PC): install Node 20+, `git clone` the repo, `npm install`,
`npm run dev`. The `~/.local/node-current` PATH note is specific to Giulia's Mac; a normal Node
install is fine elsewhere.

---

## 4. Tech stack

- **Vite + React 18 + TypeScript**
- **TipTap** rich-text editor (`@tiptap/react`, starter-kit, underline, placeholder, custom marks)
- **Zustand** state, persisted to **IndexedDB** via `idb-keyval` (local-first)
- **react-router-dom** hash router
- **@dnd-kit** for drag-reorder
- **docx** (client-side Word export); browser print → PDF via `@media print`
- Serverless functions in `api/` for the Claude + Brain connections (Vercel Node functions)

---

## 5. Project map

```
src/
  screens/        Dashboard, Overview, Editor, FocusSection, Reader,
                  About(Foundation), Settings, Publish, Grow, Onboarding,
                  ChapterBrief/Resources/Settings
  components/     SectionEditor (TipTap surface + bubble menu), Layout,
                  Hint (tooltip), EditorBoundary, NotePopover, StatusChip, …
  store/          useBookStore.ts  ← Zustand store + all actions + persist migrations
  lib/            claude.ts, brain.ts, exportDocx.ts, paginate.ts, text.ts,
                  imagestore.ts, voicenote.ts, notemark.ts, uppercase.ts, …
  data/           survey.ts, publish.ts, grow.ts (seed content/config)
  styles/         *.css (one per area; theme.css has the CSS variables)
api/
  claude/{draft,health}.js     Vercel functions for AI drafting
  brain/{health,search,text}.js Vercel functions for the brain
server/
  claude.js       Anthropic Messages API caller + prompt builder (shared)
  brain.js        BigQuery query logic (shared)
  index.js        local dev proxy (npm run brain) serving /claude/* and /brain/*
  config-env.js   builds brain config from env vars
  mock.js         mock brain fixtures
DEPLOY.md         deploy + env-var reference
```

**Data model** (in `src/types.ts`): `Workspace → Books[] → Chapters[] → Sections[]`. Each **Book is
fully independent** (own settings/voice/references/templates/chapters/about/resources/notes). Use the
`currentBook(s)` selector; store actions target `currentBookId` via the `patchBook` helper. Persist
has versioned migrations plus a `merge` self-heal that backfills missing fields on every hydrate.

---

## 6. The Claude (AI drafting) connection

- Code: `api/claude/{draft,health}.js` + shared `server/claude.js`. Calls the **Anthropic Messages
  API** with a raw `fetch` (no SDK).
- The **system prompt** carries Giulia's brand voice + the **§5 content-integrity rules** (§8 below).
- Model defaults to **`claude-opus-4-8`**; override with the `CLAUDE_MODEL` env var.
- **Demo vs live:** it replies in `demo` mode until the env var **`ANTHROPIC_API_KEY`** (an `sk-ant-…`
  key from `console.anthropic.com`) is set in **Vercel → Settings → Environment Variables**, then
  redeploy. The focus-mode button shows a status pill (**demo mode** / **connected**).
- **UX (per §5):** the draft is shown in a **review card** (Copy / place-into-section) — never
  auto-injected. It leaves bracketed `[placeholders]` where a real specific is missing rather than
  inventing.

## 7. The BIG TRIBE BRAIN (retrieval) connection

- Code: `api/brain/{health,search,text}.js` + `server/` proxy. Runs in **mock** mode until BigQuery
  env vars are set in Vercel:
  - `GCP_SA_KEY` — a **read-only service-account key** as JSON
  - `BTB_BQ_PROJECT`, `BTB_BQ_DATASET`, and optional `BTB_BQ_*` table/embedding overrides
- Go-live steps are in **`server/README.md`** and **`DEPLOY.md`**.
- The brain and uploaded resources feed the *same* "retrieved passages" slot in an AI prompt — the
  app queries whichever are connected (see §9.3).

---

## 8. §5 content-integrity rules (non-negotiable — govern ALL AI)

These are baked into the Claude system prompt and must never be relaxed:

- **Never fabricate** stories, timelines, details, statistics, or motivations.
- **Never invent quotes**, and never sequence Giulia's real quotes into a narrative she did not tell.
- **No gap-filling** — "I made a list" stays "I made a list".
- **The reader (a community host) is the hero**, not the author.
- **Source-first:** draw only on the brief + provided source passages; use bracketed placeholders
  where a real specific is needed, never invention.
- **Voice (locked):** Brené Brown warmth/intimacy (no regional informality) + Aaron Dignan
  systemic/living-systems thinking.

---

## 9. Current state & roadmap

### Built and working
Multi-book dashboard; per-book **Write · Read · Publish · Grow** (+ ⋮ Foundation/Settings); chapter
editor (TipTap bubble menu, autosave, margin notes); single-section **focus mode** with a per-section
"Brief for AI" (text + voice note); Foundation/About survey; references library; editable
chapter-structure templates; **Word + Print/PDF export** + comments panel; **Publish** cockpit (KDP
checklist + metadata); **Grow** cockpit (6-month tour + metrics + flywheel); new-book onboarding
wizard; **Claude section-drafting (demo mode)**; quiet Notion-style tooltips (`Hint` component —
currently only on the Draft button, not yet rolled out app-wide); `EditorBoundary` guarding a benign
TipTap unmount error; `React.StrictMode` removed so dev mirrors prod.

### Next steps (priority order set 2026-07-02)
1. **User accounts + auth** (Google / email / Facebook) + a short first-run onboarding that seeds the
   Settings basics and puts **one empty book on the shelf**. This is the **"accounts + backend"
   pivot** away from local-first IndexedDB toward a **per-user cloud database** (required for
   multi-device and for subscriptions).
2. **Subscription model** — free during the testing period → paid tiers via **Stripe**. Must **meter
   Claude AI usage per plan** (each draft costs real API money).
3. **Retrieval layer (the "second brain" / RAG)** — feed the book Foundation + uploaded resources +
   BIG TRIBE BRAIN passages into each Claude prompt, tagged with provenance, using **prompt caching**
   for the stable layers (voice + §5 + foundation).

### Recommended stack for steps 1–2 (under discussion, not yet decided)
- **Option A — Supabase**: Postgres + Auth (Google/email/Facebook/Apple) + Row-Level Security in one
  place; wire **Stripe** for billing. Cheapest at scale, one system to learn.
- **Option B — Clerk + Stripe**: drop-in, beautiful auth UI with social logins, and Clerk has
  built-in billing on top of Stripe. Fastest to a polished sign-up; you still need a DB for book data.
- Either way, the real work is **moving book data from IndexedDB to a per-user cloud store** (can stay
  offline-first with sync). Decide the stack before building.

---

## 10. Security / ops notes

- **Never commit secrets.** `ANTHROPIC_API_KEY`, `GCP_SA_KEY`, Stripe keys all live in **Vercel env
  vars**, never in the repo. The brain service-account key (`server/brain-key.json`) is gitignored.
- GitHub pushes from Giulia's Mac use a **Personal Access Token** entered at push time (or pasted for
  the assistant to push ephemerally, then revoked). No token is stored in `.git/config`.
- Data is **per-browser** today — clearing site data wipes local books. Cloud accounts (step 1) fix
  this.

---

## 11. Starting a fresh chat (for Martin)

1. Open the team memory and retrieve: *"Big Tribe Builders app setup, Claude and brain connections,
   build state and next steps."* (Three memories were stored 2026-07-02 covering setup/run,
   connections, and build-state/next-steps.)
2. Read this `HANDOFF.md` in the repo.
3. Confirm you can run it: `export PATH…` → `npm install` → `npm run dev` (see §3).
4. Pick up from **§9 Next steps** — the current focus is **accounts + auth + onboarding**, then the
   **subscription model**, then the **retrieval layer**.
