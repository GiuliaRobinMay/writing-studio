// Live BIG TRIBE BRAIN access via BigQuery (read-only).
// The @google-cloud/bigquery client is loaded lazily so the server runs in mock
// mode with zero dependencies until the real brain is configured.
//
// Configure by copying config.example.json → config.json (gitignored) with your
// project, dataset, table/model names, and the path to a read-only
// service-account key. Then: `npm install @google-cloud/bigquery` and restart.

let bq = null

async function client(config) {
  if (bq) return bq
  let BigQuery
  try {
    ;({ BigQuery } = await import('@google-cloud/bigquery'))
  } catch {
    throw new Error(
      "@google-cloud/bigquery is not installed. Run `npm install @google-cloud/bigquery` in /server to go live.",
    )
  }
  bq = new BigQuery({
    projectId: config.projectId,
    location: config.location,
    // Local dev uses a key file; Vercel passes the parsed credentials object.
    ...(config.credentials ? { credentials: config.credentials } : { keyFilename: config.keyFile }),
  })
  return bq
}

export async function health(config) {
  const c = await client(config)
  await c.query({ query: 'SELECT 1 AS ok', location: config.location })
  return { ok: true, mode: 'live', message: `Connected to ${config.projectId}.${config.dataset}` }
}

// Thematic / entity vector search (the known-good pattern from the spec):
// embed the query with the SAME model the table was built with, VECTOR_SEARCH
// against the embedded-entities table, then join entity ids to `nodes`.
export async function entitySearch(config, query, topK = 5) {
  const c = await client(config)
  const { dataset, entitiesTable, nodesTable, embeddingModel, embeddingColumn = 'embedding' } = config
  const sql = `
    WITH q AS (
      SELECT ml_generate_embedding_result AS embedding
      FROM ML.GENERATE_EMBEDDING(
        MODEL \`${dataset}.${embeddingModel}\`,
        (SELECT @query AS content)
      )
    )
    SELECT
      n.name,
      n.description AS text,
      n.mention_count AS mentionCount,
      vs.distance AS distance,
      'BIG TRIBE BRAIN — entity' AS source
    FROM VECTOR_SEARCH(
      TABLE \`${dataset}.${entitiesTable}\`,
      '${embeddingColumn}',
      (SELECT embedding FROM q),
      top_k => @topK,
      distance_type => 'COSINE'
    ) AS vs
    JOIN \`${dataset}.${nodesTable}\` AS n
      ON n.id = vs.base.entity_id
    ORDER BY distance ASC
  `
  const [rows] = await c.query({ query: sql, params: { query, topK }, location: config.location })
  return rows
}

// Direct text search over raw passage chunks.
export async function textSearch(config, query, topK = 5) {
  const c = await client(config)
  const { dataset, chunksTable } = config
  const sql = `
    SELECT text, source, 0 AS distance
    FROM \`${dataset}.${chunksTable}\`
    WHERE LOWER(text) LIKE CONCAT('%', LOWER(@query), '%')
    LIMIT @topK
  `
  const [rows] = await c.query({ query: sql, params: { query, topK }, location: config.location })
  return rows
}
