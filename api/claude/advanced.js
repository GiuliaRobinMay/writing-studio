// Vercel serverless function — POST /api/claude/advanced
// Tier-2 graph search: Claude drives expand/routes/influential/gaps on the
// gateway from the author's seed entities; findings come back grounded.
import { advancedSearch } from '../../server/advanced.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.ANTHROPIC_API_KEY
  const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
  if (!key || !mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await advancedSearch(key, req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
