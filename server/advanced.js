// Advanced (tier-2) graph search: Claude drives the gateway's graph tools —
// expand / routes / influential / gaps — from seed entities the author picked
// after a research pass. Same raw-fetch + MCP-connector shape as research.js;
// the model narrates each finding in plain language and hands back the
// grounding passages so results are addable to the Context panel like any hit.

import { buildResearchRequest } from './research.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_CONTINUATIONS = 5

const MODES = {
  expand: 'Use graph_expand around the seed node ids (2 hops) to map the neighborhood.',
  routes: 'Use graph_routes between the two seed node ids to find the explaining chains that connect them. If there is no route, say what that disconnect means.',
  influential: 'Use graph_influential to find the bridging ideas this knowledge base routes through.',
  gaps: 'Use graph_gaps to find pairs of themes the corpus barely connects — things the book has not said yet.',
}

export function buildAdvancedRequest(payload = {}, mcpToken) {
  const { mode = 'expand', seeds = [], sectionTitle, brief } = payload
  // Reuse research.js's gateway wiring (model, mcp_servers, tools) — only the
  // instructions differ.
  const base = buildResearchRequest({ query: 'advanced' }, mcpToken)

  const system = `You are the advanced graph-search engine inside a book-writing studio. The author's knowledge graph was built from their own sources; every edge cites the passage it came from. ${MODES[mode] || MODES.expand}

Reply with ONLY a JSON object, no prose:
{"findings": [{"title": "...", "detail": "...", "chunks": [{"chunkId": "...", "sourceId": "...", "quote": "..."}]}]}
- title: one plain-language line an author instantly understands (e.g. "Belonging connects to revenue only through retention").
- detail: 1-3 sentences on why this matters for their writing.
- chunks: the grounding passages from the tool results (provenance chunk_id / source_id / quote) — include every one the finding rests on.
Max 5 findings, best first. If the graph is too small, return {"findings": [], "note": "<the tool's note>"}.`

  const context = []
  if (sectionTitle) context.push(`Section being written: ${sectionTitle}`)
  if (brief && brief.trim()) context.push(`Section brief: ${brief.trim()}`)
  if (seeds.length) context.push(`Seed nodes: ${seeds.map((s) => `${s.name} (${s.nodeId})`).join(', ')}`)

  return {
    ...base,
    system,
    messages: [{ role: 'user', content: `${context.join('\n')}\n\nMode: ${mode}` }],
  }
}

export function parseAdvancedResponse(content = []) {
  for (const block of content) {
    if (block.type !== 'text') continue
    const m = block.text.match(/\{[\s\S]*\}/)
    if (!m) continue
    try {
      const j = JSON.parse(m[0])
      if (Array.isArray(j.findings)) {
        return {
          mode: 'live',
          findings: j.findings.slice(0, 5).map((f) => ({
            title: f.title || '',
            detail: f.detail || '',
            chunks: (f.chunks || []).map((c) => ({
              chunkId: c.chunkId || c.chunk_id,
              sourceId: c.sourceId || c.source_id,
              quote: c.quote || '',
            })),
          })),
          ...(j.note ? { note: j.note } : {}),
        }
      }
    } catch {
      /* try the next block */
    }
  }
  return { mode: 'live', findings: [], note: 'The graph had nothing to say yet — run more research first.' }
}

export async function advancedSearch(apiKey, payload, mcpToken) {
  const request = buildAdvancedRequest(payload, mcpToken)
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'mcp-client-2025-11-20',
  }
  let messages = request.messages
  let response = null
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const r = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ ...request, messages }) })
    if (!r.ok) {
      let msg = `Claude returned ${r.status}`
      try {
        const j = await r.json()
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* keep status */
      }
      throw new Error(msg)
    }
    response = await r.json()
    if (response.stop_reason !== 'pause_turn') break
    messages = [...request.messages, { role: 'assistant', content: response.content }]
  }
  return parseAdvancedResponse(response?.content)
}
