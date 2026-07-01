# Deploying to Vercel

The app is a static Vite frontend plus a small serverless backend (`/api`) that
proxies the BigQuery brain (and, later, Claude drafting). Your writing data is
**local-first** — it lives in each browser's IndexedDB, so deploying gives you
online access, not cross-device sync (see the note at the bottom).

## 1. First deploy (the app itself — no config needed)

1. Push the repo to GitHub (already done: `GiuliaRobinMay/writing-studio`).
2. Go to **vercel.com → Add New → Project → Import** `writing-studio`.
3. Vercel auto-detects Vite (build `npm run build`, output `dist`). Click **Deploy**.

That's it — the full studio works immediately. The brain panel shows **mock**
mode until you add the env vars below.

Local dev is unchanged: `npm run dev` (app) + `npm run brain` (local brain on
:5274). In production the app calls the same-origin `/api/brain/*` functions.

## 2. Go live with the brain (read-only, when ready)

The serverless functions in `api/brain/*` run in mock mode until these
**Environment Variables** are set in the Vercel project (Settings → Environment
Variables), then redeploy:

| Variable | Value |
|---|---|
| `GCP_SA_KEY` | The **full JSON** of a read-only service-account key (BigQuery Data Viewer + Job User) |
| `BTB_BQ_PROJECT` | GCP project id |
| `BTB_BQ_DATASET` | dataset holding the brain tables |
| `BTB_BQ_LOCATION` | dataset region (e.g. `US`, `EU`) |
| `BTB_EMBEDDING_MODEL` | BQML embedding model name |
| `BTB_ENTITIES_TABLE` | (optional) default `e1_entity_names_embedded` |
| `BTB_NODES_TABLE` | (optional) default `nodes` |
| `BTB_CHUNKS_TABLE` | (optional) default `chunks` |
| `BTB_EMBEDDING_COLUMN` | (optional) default `embedding` |

Also add the BigQuery client so Vercel installs it for the functions:

```bash
npm install @google-cloud/bigquery
git commit -am "Enable live brain (BigQuery client)"
```

The exact query shapes live in `server/brain.js` (shared by local + Vercel) and
may need small column-name tweaks to match the real schema.

## 3. Claude / AI drafting (later)

Add an `api/draft.js` serverless function that calls the Anthropic API with the
book's voice + §5 guardrails as the system prompt and approved sources as
context. Store the key as an `ANTHROPIC_API_KEY` env var. Model: Opus 4.8 for
prose, Sonnet 4.6 for structure.

## Note on data (important)

Because the app is local-first, the hosted version does **not** share your books
across devices/browsers — each origin has its own IndexedDB. Multi-device use
and the 3-tier product launch will need accounts + a server-side database
(a separate build).
