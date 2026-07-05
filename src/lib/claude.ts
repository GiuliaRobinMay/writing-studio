// Client for the Claude connection. The API key never lives here — the browser
// calls a small server function (local dev server in DEV, Vercel /api in prod)
// that holds the key. Until a key is configured the service replies in 'demo'
// mode, so the UI works end-to-end and lights up the moment the key is added.

function base(): string {
  return import.meta.env.DEV ? 'http://localhost:5274' : '/api'
}

export interface ClaudeHealth {
  ok: boolean
  mode: 'demo' | 'live'
  message: string
}

/** One grounding passage from the Context panel, with the author's why. */
export interface DraftContextItem {
  excerpt: string
  source: string
  why?: string
}

export interface DraftPayload {
  voice?: string
  bookTitle?: string
  chapterTitle?: string
  sectionLabel?: string
  sectionTitle?: string
  brief?: string
  sources?: string[]
  context?: DraftContextItem[]
}

export interface DraftResult {
  mode: 'demo' | 'live'
  draft?: string
  model?: string
}

export async function claudeHealth(): Promise<ClaudeHealth> {
  const r = await fetch(`${base()}/claude/health`)
  if (!r.ok) throw new Error(`Service returned ${r.status}`)
  return r.json()
}

export async function draftSection(payload: DraftPayload): Promise<DraftResult> {
  const r = await fetch(`${base()}/claude/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) {
    let msg = `Service returned ${r.status}`
    try {
      const j = await r.json()
      if (j?.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return r.json()
}
