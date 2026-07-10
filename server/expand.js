// Read more of a book passage: proxy to the gateway's deterministic
// /read/<collection>/expand endpoint. No Claude call — expanding a passage is
// a page turn, not research, so it costs a BigQuery lookup and nothing else.
// Same token as research; same demo fallback when the connection isn't live.
import { collection, gatewayUrl } from './research.js'

export async function expandChunk(payload = {}, mcpToken) {
  const { chunkId, window } = payload
  if (!chunkId) return { mode: 'live', ok: false, error: 'chunkId required' }
  const r = await fetch(`${gatewayUrl()}/read/${collection()}/expand`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${mcpToken}`,
    },
    body: JSON.stringify({ chunk_id: chunkId, ...(window ? { window } : {}) }),
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error(`Gateway returned ${r.status}`)
  const j = await r.json()
  if (!j.ok) return { mode: 'live', ok: false, error: j.error }
  return {
    mode: 'live',
    ok: true,
    segments: j.segments,
    pageStart: j.page_start,
    pageEnd: j.page_end,
    hasMoreBefore: j.has_more_before,
    hasMoreAfter: j.has_more_after,
  }
}
