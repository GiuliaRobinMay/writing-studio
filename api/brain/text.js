// Vercel serverless function — POST /api/brain/text  (direct passage search)
import { configFromEnv } from '../../server/config-env.js'
import * as brain from '../../server/brain.js'
import { mockSearch } from '../../server/mock.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { query, topK = 5 } = req.body || {}
  const config = configFromEnv()
  if (!config) return res.status(200).json({ mode: 'mock', results: mockSearch(query, topK) })
  try {
    return res.status(200).json({ mode: 'live', results: await brain.textSearch(config, query, topK) })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
