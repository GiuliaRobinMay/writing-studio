// Vercel serverless function — GET /api/brain/health
import { configFromEnv } from '../../server/config-env.js'
import * as brain from '../../server/brain.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const config = configFromEnv()
  if (!config) {
    return res.status(200).json({ ok: true, mode: 'mock', message: 'Mock brain — set the BTB_BQ_* env vars to go live' })
  }
  try {
    return res.status(200).json(await brain.health(config))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
