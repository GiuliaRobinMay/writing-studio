// Vercel serverless function — GET /api/brain/health
// The brain connection now lives behind the BIG TRIBE BRAIN MCP gateway; this
// pings it so the Settings pill reflects the real connection.
import { gatewayHealth } from '../../server/research.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    return res.status(200).json(await gatewayHealth())
  } catch (e) {
    return res.status(200).json({ ok: false, mode: 'mock', message: `Gateway unreachable: ${e.message}` })
  }
}
