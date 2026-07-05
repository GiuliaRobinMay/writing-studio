// Vercel serverless function — POST /api/claude/research
// One synchronous research loop: Claude (Sonnet) searches the author's corpus
// through the MCP gateway, extracts entities, writes them back to the graph,
// and returns {chunks, entities, written} for the Context panel.
import { researchSection } from '../../server/research.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.ANTHROPIC_API_KEY
  // The author's gateway token (Auth0 login in Settings) rides on a header;
  // a server-side service token is the fallback until that login ships.
  const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
  if (!key || !mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await researchSection(key, req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
