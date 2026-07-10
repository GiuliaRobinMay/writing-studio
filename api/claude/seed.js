// Vercel serverless function — POST /api/claude/seed
// Seed the knowledge base from the author's own material (foundation survey,
// pasted sources): ingest via add_source, extract + write back via research.
import { seedSource } from '../../server/seed.js'
import { resolveMcpToken } from '../../server/gatewayAuth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.ANTHROPIC_API_KEY
  const mcpToken = await resolveMcpToken(req)
  if (!key || !mcpToken) return res.status(200).json({ mode: 'demo' })
  try {
    return res.status(200).json(await seedSource(key, req.body || {}, mcpToken))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
