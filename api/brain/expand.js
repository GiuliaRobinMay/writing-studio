// Vercel serverless function — POST /api/brain/expand
// The reading-order window around a book chunk, straight from the gateway
// (no model in the loop). Needs only the author's gateway token.
import { expandChunk } from '../../server/expand.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
  if (!mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await expandChunk(req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
