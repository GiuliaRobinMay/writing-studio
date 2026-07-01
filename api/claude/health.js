// Vercel serverless function — GET /api/claude/health
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      ok: true,
      mode: 'demo',
      message: 'Claude not connected — add ANTHROPIC_API_KEY in Vercel to go live',
    })
  }
  return res.status(200).json({ ok: true, mode: 'live', message: 'Claude connected' })
}
