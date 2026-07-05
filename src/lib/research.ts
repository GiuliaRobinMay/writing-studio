// Client for the research connection (tier 1: hybrid corpus search + the graph
// entities those passages mention). Mirrors lib/claude.ts: the browser only ever
// calls a server function — credentials never live here. Until the
// /api/claude/research endpoint ships (or while it reports demo mode), the
// client answers with on-theme demo fixtures so the Context panel works
// end-to-end and lights up the moment the connection is live.

function base(): string {
  return import.meta.env.DEV ? 'http://localhost:5274' : '/api'
}

export interface ResearchChunk {
  chunkId: string
  sourceId: string
  /** Human-readable provenance: book / video title + locator. */
  source: string
  text: string
  score?: number
}

export interface ResearchEntity {
  nodeId: string
  name: string
  type: string
}

export interface ResearchPayload {
  query: string
  bookTitle?: string
  chapterTitle?: string
  sectionLabel?: string
  sectionTitle?: string
  brief?: string
}

export interface ResearchResult {
  mode: 'demo' | 'live'
  chunks: ResearchChunk[]
  entities: ResearchEntity[]
  /** Rows written back to the graph by this search (live mode). */
  written?: { nodes: number; edges: number; claims: number }
}

const DEMO_CHUNKS: ResearchChunk[] = [
  {
    chunkId: 'demo-ch-1',
    sourceId: 'demo-src-loom',
    source: 'Demo · community workshop recording',
    text: 'People don’t stay for the content — they stay because someone noticed they were gone. The moment a member is welcomed back by name, belonging stops being a promise and becomes a fact.',
  },
  {
    chunkId: 'demo-ch-2',
    sourceId: 'demo-src-book',
    source: 'Demo · founder interview notes',
    text: 'Every thriving community we studied had a rhythm: a weekly moment members could set their watch by. The rhythm mattered more than the format — the format changed, the rhythm never did.',
  },
  {
    chunkId: 'demo-ch-3',
    sourceId: 'demo-src-book',
    source: 'Demo · retention research summary',
    text: 'Retention followed contribution, not consumption. Members who had been asked to help someone else in their first month renewed at nearly twice the rate of those who had only attended.',
  },
]

const DEMO_ENTITIES: ResearchEntity[] = [
  { nodeId: 'demo-n-belonging', name: 'Belonging', type: 'concept' },
  { nodeId: 'demo-n-rhythm', name: 'Community rhythm', type: 'practice' },
  { nodeId: 'demo-n-contribution', name: 'Contribution', type: 'concept' },
]

function demoResult(): ResearchResult {
  return { mode: 'demo', chunks: DEMO_CHUNKS, entities: DEMO_ENTITIES }
}

export async function researchSection(payload: ResearchPayload): Promise<ResearchResult> {
  try {
    const r = await fetch(`${base()}/claude/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) return demoResult()
    const j = (await r.json()) as ResearchResult
    return j.mode === 'live' ? j : demoResult()
  } catch {
    return demoResult()
  }
}
