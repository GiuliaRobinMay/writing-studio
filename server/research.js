// Research connection: Claude (Sonnet) acts as the agent and calls the
// BIG TRIBE BRAIN's MCP gateway — hybrid corpus search + entity extraction +
// knowledge-graph write-back happen in ONE synchronous loop server-side.
// Raw fetch, same as claude.js: keys and tokens live in the environment or the
// caller's session, never in the browser bundle.
//
// The MCP connector does the tool round-trips inside a single Messages API
// request (beta mcp-client-2025-11-20): we declare the gateway as an MCP
// server, Claude calls its `research` tool, and the tool results come back as
// content blocks we parse here. Every search grows the author's graph — that
// is the point, not a side effect.

const API_URL = 'https://api.anthropic.com/v1/messages'
// The research loop runs on Sonnet by design (fast + cheap per search click);
// Opus stays reserved for drafting where voice fidelity matters.
const RESEARCH_MODEL = 'claude-sonnet-5'
const GATEWAY_URL = 'https://graphrag-gateway-f3kwtofzka-ew.a.run.app'
const MAX_CONTINUATIONS = 5

function gatewayUrl() {
  return (process.env.GRAPHRAG_GATEWAY_URL || GATEWAY_URL).replace(/\/$/, '')
}

function collection() {
  return process.env.GRAPHRAG_COLLECTION || 'giulia'
}

export async function gatewayHealth() {
  const r = await fetch(`${gatewayUrl()}/health`, { signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`Gateway returned ${r.status}`)
  const j = await r.json()
  return { ok: true, mode: 'live', message: `BIG TRIBE BRAIN gateway up (${(j.collections || []).length} collections)` }
}

/** Build the Messages API request for one research loop. */
export function buildResearchRequest(payload = {}, mcpToken) {
  const { query, bookTitle, chapterTitle, sectionLabel, sectionTitle, brief } = payload

  const system = `You are the research engine inside a book-writing studio. The author is writing ONE section and asked you to search their own knowledge base (their books, videos and notes) for grounding material. You have ONE tool source: the "graphrag" MCP server, whose \`research(query, learned)\` tool does a hybrid search over the author's corpus and WRITES BACK what you learned to their knowledge graph.

Do exactly this, in order:
1. Call research with the author's query and learned={} — read the passages it returns.
2. From those passages, extract the entities (people, concepts, practices, places) and the relationships between them that are relevant to THIS section's topic. Follow the integrity rules: only extract what the passages actually say — every edge and claim must cite the chunk_id it came from with a verbatim quote from that passage. Never invent.
3. Call research AGAIN with the same query and your extraction as \`learned\` (matching the schema the first call returned) — this stores it in the author's graph.
4. Reply with ONLY a JSON object, no prose: {"entities": [{"name": "...", "type": "..."}]} — the entities most relevant to the section, best first, max 8.`

  const context = []
  if (bookTitle) context.push(`Book: ${bookTitle}`)
  if (chapterTitle) context.push(`Chapter: ${chapterTitle}`)
  if (sectionTitle || sectionLabel) context.push(`Section: ${sectionTitle || sectionLabel}`)
  if (brief && brief.trim()) context.push(`Section brief: ${brief.trim()}`)

  return {
    model: process.env.CLAUDE_RESEARCH_MODEL || RESEARCH_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    mcp_servers: [
      {
        type: 'url',
        url: `${gatewayUrl()}/mcp/${collection()}`,
        name: 'graphrag',
        ...(mcpToken ? { authorization_token: mcpToken } : {}),
      },
    ],
    tools: [{ type: 'mcp_toolset', mcp_server_name: 'graphrag' }],
    system,
    messages: [
      {
        role: 'user',
        content: `${context.join('\n')}\n\nSearch query: ${query}`,
      },
    ],
  }
}

/** Pull chunks / entities / write-back stats out of the response content blocks. */
export function parseResearchResponse(content = []) {
  let passages = []
  let written = null
  let entities = []

  for (const block of content) {
    if (block.type === 'mcp_tool_result' && !block.is_error) {
      // Tool results arrive as text blocks holding the research tool's JSON.
      const text = (block.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')
      try {
        const j = JSON.parse(text)
        if (Array.isArray(j.passages) && j.passages.length) passages = j.passages
        if (j.stored && j.stored.written) {
          written = {
            nodes: j.stored.written.nodes || 0,
            edges: j.stored.written.edges || 0,
            claims: j.stored.written.claims || 0,
          }
        }
      } catch {
        /* non-JSON tool output — skip */
      }
    }
    if (block.type === 'text') {
      const m = block.text.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          const j = JSON.parse(m[0])
          if (Array.isArray(j.entities)) entities = j.entities
        } catch {
          /* final text wasn't JSON — entities stay empty */
        }
      }
    }
  }

  return {
    mode: 'live',
    chunks: passages.map((p) => ({
      chunkId: p.chunk_id,
      sourceId: p.source_id,
      source: `${p.source_type === 'loom' || p.source_type === 'video' ? 'Video' : 'Book'} · ${p.source_id}`,
      text: p.text,
      score: p.score,
    })),
    entities: entities.slice(0, 8).map((e) => ({
      nodeId: `${e.type || 'concept'}:${(e.name || '').toLowerCase().replace(/\s+/g, '-')}`,
      name: e.name,
      type: e.type || 'concept',
    })),
    ...(written ? { written } : {}),
  }
}

/** Run the synchronous research loop. Returns {mode, chunks, entities, written?}. */
export async function researchSection(apiKey, payload, mcpToken) {
  const request = buildResearchRequest(payload, mcpToken)
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'mcp-client-2025-11-20',
  }

  let messages = request.messages
  let response = null
  // Server-side tool loops can pause (stop_reason pause_turn) — re-send to resume.
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, messages }),
    })
    if (!r.ok) {
      let msg = `Claude returned ${r.status}`
      try {
        const j = await r.json()
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* keep the status message */
      }
      throw new Error(msg)
    }
    response = await r.json()
    if (response.stop_reason !== 'pause_turn') break
    messages = [...request.messages, { role: 'assistant', content: response.content }]
  }

  return parseResearchResponse(response?.content)
}
