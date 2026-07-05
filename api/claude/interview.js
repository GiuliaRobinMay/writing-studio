// Vercel serverless function — POST /api/claude/interview
// "Teach the Brain": one interview turn — the author's latest answer is
// ingested + extracted into the graph, and the next question comes back.
import { interviewTurn } from '../../server/seed.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.ANTHROPIC_API_KEY
  const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
  if (!key || !mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await interviewTurn(key, req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
