// Vercel serverless function — POST /api/brain/expand
// The reading-order window around a book chunk, straight from the gateway
// (no model in the loop). Needs only the author's gateway token.
import { expandChunk } from '../../server/expand.js'
import { resolveMcpToken } from '../../server/gatewayAuth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const mcpToken = await resolveMcpToken(req)
  if (!mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await expandChunk(req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
