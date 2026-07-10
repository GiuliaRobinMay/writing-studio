// BIG TRIBE BRAIN service — a tiny local proxy between the (browser) app and the
// BigQuery brain. Holds credentials server-side; the app never sees them.
// Runs in MOCK mode until server/config.json exists. Read-only.

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mockSearch } from './mock.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.BRAIN_PORT || 5274
const CONFIG_PATH = join(__dirname, 'config.json')

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch (e) {
    console.error('Could not parse config.json:', e.message)
    return null
  }
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const config = loadConfig()
  const live = !!config

  try {
    if (url.pathname === '/brain/health') {
      if (!live) return send(res, 200, { ok: true, mode: 'mock', message: 'Mock brain — not yet connected to BigQuery' })
      const brain = await import('./brain.js')
      return send(res, 200, await brain.health(config))
    }

    if (url.pathname === '/brain/search' && req.method === 'POST') {
      const { query, topK = 5 } = await readBody(req)
      if (!live) return send(res, 200, { mode: 'mock', results: mockSearch(query, topK) })
      const brain = await import('./brain.js')
      return send(res, 200, { mode: 'live', results: await brain.entitySearch(config, query, topK) })
    }

    if (url.pathname === '/brain/text' && req.method === 'POST') {
      const { query, topK = 5 } = await readBody(req)
      if (!live) return send(res, 200, { mode: 'mock', results: mockSearch(query, topK) })
      const brain = await import('./brain.js')
      return send(res, 200, { mode: 'live', results: await brain.textSearch(config, query, topK) })
    }

    if (url.pathname === '/brain/expand' && req.method === 'POST') {
      const payload = await readBody(req)
      const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
      if (!mcpToken) return send(res, 200, { mode: 'demo' })
      const { expandChunk } = await import('./expand.js')
      return send(res, 200, await expandChunk(payload, mcpToken))
    }

    // ── Claude connection (section drafting) ──
    if (url.pathname === '/claude/health') {
      if (!process.env.ANTHROPIC_API_KEY) {
        return send(res, 200, { ok: true, mode: 'demo', message: 'Claude not connected — set ANTHROPIC_API_KEY to go live' })
      }
      return send(res, 200, { ok: true, mode: 'live', message: 'Claude connected' })
    }

    if (url.pathname === '/claude/research' && req.method === 'POST') {
      const payload = await readBody(req)
      const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
      if (!process.env.ANTHROPIC_API_KEY || !mcpToken) return send(res, 200, { mode: 'demo' })
      const { researchSection } = await import('./research.js')
      return send(res, 200, await researchSection(process.env.ANTHROPIC_API_KEY, payload, mcpToken))
    }

    if ((url.pathname === '/claude/advanced' || url.pathname === '/claude/seed' ||
         url.pathname === '/claude/interview') && req.method === 'POST') {
      const payload = await readBody(req)
      const mcpToken = req.headers['x-mcp-token'] || process.env.GRAPHRAG_MCP_TOKEN
      if (!process.env.ANTHROPIC_API_KEY || !mcpToken) return send(res, 200, { mode: 'demo' })
      if (url.pathname === '/claude/advanced') {
        const { advancedSearch } = await import('./advanced.js')
        return send(res, 200, await advancedSearch(process.env.ANTHROPIC_API_KEY, payload, mcpToken))
      }
      const { seedSource, interviewTurn } = await import('./seed.js')
      const fn = url.pathname === '/claude/seed' ? seedSource : interviewTurn
      return send(res, 200, await fn(process.env.ANTHROPIC_API_KEY, payload, mcpToken))
    }

    if (url.pathname === '/claude/draft' && req.method === 'POST') {
      const payload = await readBody(req)
      if (!process.env.ANTHROPIC_API_KEY) return send(res, 200, { mode: 'demo' })
      const { draftSection } = await import('./claude.js')
      const { text, model } = await draftSection(process.env.ANTHROPIC_API_KEY, payload)
      return send(res, 200, { mode: 'live', draft: text, model })
    }

    return send(res, 404, { error: 'Not found' })
  } catch (e) {
    console.error('Brain error:', e.message)
    return send(res, 500, { error: e.message })
  }
})

server.listen(PORT, () => {
  const mode = existsSync(CONFIG_PATH) ? 'LIVE (config.json found)' : 'MOCK (no config.json)'
  console.log(`BIG TRIBE BRAIN service on http://localhost:${PORT} — ${mode}`)
})
