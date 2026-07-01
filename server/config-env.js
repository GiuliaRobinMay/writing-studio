// Build the brain config from environment variables (used by the Vercel
// serverless functions). Returns null when the brain isn't configured yet, so
// the API falls back to mock mode. The local dev server reads config.json
// instead — both feed the same query logic in brain.js.

export function configFromEnv() {
  if (!process.env.BTB_BQ_PROJECT || !process.env.GCP_SA_KEY) return null
  let credentials
  try {
    credentials = JSON.parse(process.env.GCP_SA_KEY)
  } catch {
    return null
  }
  return {
    projectId: process.env.BTB_BQ_PROJECT,
    dataset: process.env.BTB_BQ_DATASET,
    location: process.env.BTB_BQ_LOCATION || 'US',
    credentials,
    entitiesTable: process.env.BTB_ENTITIES_TABLE || 'e1_entity_names_embedded',
    nodesTable: process.env.BTB_NODES_TABLE || 'nodes',
    chunksTable: process.env.BTB_CHUNKS_TABLE || 'chunks',
    embeddingModel: process.env.BTB_EMBEDDING_MODEL,
    embeddingColumn: process.env.BTB_EMBEDDING_COLUMN || 'embedding',
  }
}
