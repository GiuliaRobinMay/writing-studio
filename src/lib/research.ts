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
  /** Human-readable provenance, resolved by the gateway: book title + chapter
   *  + page(s), podcast show + episode + timecode, or video / added-source
   *  title. Shown verbatim on the card and cited in the draft prompt. */
  source: string
  /** book | podcast | loom | studio — what kind of source the chunk came from. */
  sourceType?: string
  text: string
  score?: number
  /** Podcast only: the episode's audio enclosure + this chunk's timecodes,
   *  so the card can play the exact snippet the text transcribes. */
  audioUrl?: string
  startSec?: number
  endSec?: number
}

// ── Read more: the passage around a book chunk, sentence by sentence ────────

export interface ExpandSegment {
  seq: number
  text: string
  /** True for the sentences that ARE the original chunk (styled distinctly). */
  in_chunk: boolean
}

export interface ExpandResult {
  mode: 'demo' | 'live'
  ok?: boolean
  error?: string
  segments?: ExpandSegment[]
  pageStart?: number | null
  pageEnd?: number | null
  hasMoreBefore?: boolean
  hasMoreAfter?: boolean
}

/** Fetch the reading-order window around a book chunk (no model involved —
 *  it's a page turn, not research). Falls back to demo mode when offline. */
export async function expandChunk(payload: { chunkId: string; window?: number }): Promise<ExpandResult> {
  try {
    const token = mcpToken()
    const r = await fetch(`${base()}/brain/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mcp-token': token } : {}) },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as ExpandResult
    if (j.mode === 'live') return j
  } catch {
    /* fall through to demo */
  }
  return { mode: 'demo' }
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

// Demo fixtures mirror the real citation formats the gateway resolves:
// video title, podcast show + episode + timecode, book + chapter + pages.
const DEMO_CHUNKS: ResearchChunk[] = [
  {
    chunkId: 'demo-ch-1',
    sourceId: 'demo-src-loom',
    source: 'Community Workshop - Welcoming New Members (video)',
    sourceType: 'loom',
    text: 'People don’t stay for the content — they stay because someone noticed they were gone. The moment a member is welcomed back by name, belonging stops being a promise and becomes a fact.',
  },
  {
    chunkId: 'demo-ch-2',
    sourceId: 'demo-src-podcast',
    source: 'The Community Table — “Why Rhythm Beats Format”, 14:32',
    sourceType: 'podcast',
    text: 'Every thriving community we studied had a rhythm: a weekly moment members could set their watch by. The rhythm mattered more than the format — the format changed, the rhythm never did.',
  },
  {
    chunkId: 'demo-ch-3',
    sourceId: 'demo-src-book',
    source: 'People Powered — “Retention Follows Contribution”, pp. 112–114',
    sourceType: 'book',
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

/** The author's gateway token, once the Settings login stores it (Phase 2b). */
function mcpToken(): string | null {
  try {
    return localStorage.getItem('graphrag-token')
  } catch {
    return null
  }
}

// ── Tier 2: advanced graph search ───────────────────────────────────────────

export type AdvancedMode = 'expand' | 'routes' | 'influential' | 'gaps'

export interface AdvancedFinding {
  title: string
  detail: string
  chunks: { chunkId: string; sourceId: string; quote: string }[]
}

export interface AdvancedResult {
  mode: 'demo' | 'live'
  findings: AdvancedFinding[]
  note?: string
}

const DEMO_FINDINGS: Record<AdvancedMode, AdvancedFinding[]> = {
  expand: [
    {
      title: 'Belonging spreads through welcome rituals and naming',
      detail: 'Around your seeds, the graph links belonging to welcome practices and to members being greeted by name — two concrete mechanisms this section could show.',
      chunks: [{ chunkId: 'demo-ch-1', sourceId: 'demo-src-loom', quote: 'someone noticed they were gone' }],
    },
  ],
  routes: [
    {
      title: 'Belonging connects to revenue only through retention',
      detail: 'The single chain the corpus supports: belonging drives retention, retention protects revenue. If the section argues belonging pays, this is its citable route.',
      chunks: [{ chunkId: 'demo-ch-3', sourceId: 'demo-src-book', quote: 'Retention followed contribution, not consumption.' }],
    },
  ],
  influential: [
    {
      title: 'Retention is the bridge idea of your knowledge base',
      detail: 'Most paths between community themes and business themes route through retention — the concept your book keeps leaning on.',
      chunks: [],
    },
  ],
  gaps: [
    {
      title: 'Community rituals and pricing are barely connected',
      detail: 'Two rich clusters with almost no edges between them — the book has not yet said how community practice shapes what people will pay for.',
      chunks: [],
    },
  ],
}

export interface AdvancedPayload {
  mode: AdvancedMode
  seeds: { nodeId: string; name: string }[]
  sectionTitle?: string
  brief?: string
}

export async function advancedSearch(payload: AdvancedPayload): Promise<AdvancedResult> {
  try {
    const token = mcpToken()
    const r = await fetch(`${base()}/claude/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mcp-token': token } : {}) },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as AdvancedResult
    if (j.mode === 'live') return j
  } catch {
    /* fall through to demo */
  }
  return { mode: 'demo', findings: DEMO_FINDINGS[payload.mode] ?? [] }
}

// ── Seeding: foundation material + the Teach-the-Brain interview ───────────

export interface SeedResult {
  mode: 'demo' | 'live'
  sourceId?: string | null
  entities?: { name: string; type: string }[]
  written?: { nodes: number; edges: number; claims: number } | null
}

export async function seedSource(payload: { title: string; text: string }): Promise<SeedResult> {
  try {
    const token = mcpToken()
    const r = await fetch(`${base()}/claude/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mcp-token': token } : {}) },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as SeedResult
    if (j.mode === 'live') return j
  } catch {
    /* fall through to demo */
  }
  return { mode: 'demo' }
}

export interface InterviewTurnResult {
  mode: 'demo' | 'live'
  question: string
  stored?: { nodes: number; edges: number; claims: number } | null
}

const DEMO_QUESTIONS = [
  'What is the one idea this book exists to give its reader?',
  'Tell me about a moment you saw a community truly click — what had you done differently?',
  'What do most community builders get wrong, in your experience?',
  'Who is the reader you picture, and what are they struggling with the week they pick this up?',
]

export async function interviewTurn(payload: {
  history: { role: 'author' | 'interviewer'; text: string }[]
  bookTitle?: string
}): Promise<InterviewTurnResult> {
  try {
    const token = mcpToken()
    const r = await fetch(`${base()}/claude/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mcp-token': token } : {}) },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as InterviewTurnResult
    if (j.mode === 'live') return j
  } catch {
    /* fall through to demo */
  }
  const asked = payload.history.filter((t) => t.role === 'interviewer').length
  return { mode: 'demo', question: DEMO_QUESTIONS[asked % DEMO_QUESTIONS.length], stored: null }
}

/** True when a gateway token is stored — live seeding/search is possible. */
export function brainConnected(): boolean {
  return !!mcpToken()
}

export async function researchSection(payload: ResearchPayload): Promise<ResearchResult> {
  try {
    const token = mcpToken()
    const r = await fetch(`${base()}/claude/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mcp-token': token } : {}) },
      body: JSON.stringify(payload),
    })
    if (!r.ok) return demoResult()
    const j = (await r.json()) as ResearchResult
    return j.mode === 'live' ? j : demoResult()
  } catch {
    return demoResult()
  }
}
