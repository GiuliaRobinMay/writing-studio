// Client for the local BIG TRIBE BRAIN service (server/). Read-only.

const DEFAULT_BASE = 'http://localhost:5274'

function base(endpoint?: string): string {
  if (endpoint && /^https?:\/\//i.test(endpoint)) return endpoint.replace(/\/$/, '')
  return DEFAULT_BASE
}

export interface BrainChunk {
  id?: string
  name?: string
  text: string
  source: string
  mentionCount?: number
  distance?: number
}

export interface BrainHealth {
  ok: boolean
  mode: 'mock' | 'live'
  message: string
}

export async function brainHealth(endpoint?: string): Promise<BrainHealth> {
  const r = await fetch(`${base(endpoint)}/brain/health`)
  if (!r.ok) throw new Error(`Service returned ${r.status}`)
  return r.json()
}

export async function brainSearch(
  query: string,
  endpoint?: string,
  topK = 5,
): Promise<{ mode: string; results: BrainChunk[] }> {
  const r = await fetch(`${base(endpoint)}/brain/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  })
  if (!r.ok) throw new Error(`Service returned ${r.status}`)
  return r.json()
}
