// Vercel serverless function — POST /api/claude/draft
// Drafts one section from its brief (+ any source passages) in the book's voice.
import { draftSection } from '../../server/claude.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(200).json({ mode: 'demo' })
  try {
    const { text, model } = await draftSection(key, req.body || {})
    return res.status(200).json({ mode: 'live', draft: text, model })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
