# BIG TRIBE BRAIN service

A tiny local, read-only proxy between the app (browser) and your BigQuery brain.
Credentials live here, server-side — the app never sees them.

## Run it

From the project root:

```bash
export PATH="$HOME/.local/node-current/bin:$PATH"
npm run brain        # → http://localhost:5274
```

With no `config.json` it runs in **MOCK** mode (sample chunks) so the app's
brain panel works before the real brain is wired.

## Go live (read-only)

1. **Create a read-only service account** in your GCP project:
   - Roles: **BigQuery Data Viewer** + **BigQuery Job User**.
   - Create a JSON key, download it, save it here as `server/brain-key.json`
     (already gitignored — never commit it).
2. **Copy the config**:
   ```bash
   cp server/config.example.json server/config.json
   ```
   Fill in:
   - `projectId` — your GCP project id
   - `dataset` — the BigQuery dataset holding the brain tables
   - `location` — dataset region (e.g. `US`, `EU`, `europe-west1`)
   - `entitiesTable` / `nodesTable` / `chunksTable` — confirm/correct the names
   - `embeddingModel` — the BQML model used to embed (must match how the
     entities table was embedded)
   - `embeddingColumn` — the embedding column name on the entities table
3. **Install the BigQuery client** (only needed for live mode):
   ```bash
   cd server && npm install @google-cloud/bigquery
   ```
4. **Restart** `npm run brain`. The log will say `LIVE (config.json found)`.
   Hit **Test connection** in the app's Settings → BIG TRIBE BRAIN.

If a query errors, the exact SQL lives in `brain.js` — the entity vector-search
shape follows the known-good pattern (`ML.GENERATE_EMBEDDING` →
`VECTOR_SEARCH` COSINE → join `nodes`); column/key names may need a small tweak
to match your schema. Sharing one working query from prior work makes this exact.

Read-only by design. Write-back is intentionally not implemented until the write
schema is confirmed.
