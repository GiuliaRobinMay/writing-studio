import { useEffect, useRef, useState } from 'react'
import { currentBook, useBookStore, type ContextOwner } from '../store/useBookStore'
import {
  advancedSearch,
  expandChunk,
  researchSection,
  type AdvancedMode,
  type AdvancedResult,
  type ExpandSegment,
  type ResearchResult,
} from '../lib/research'
import { getVoiceNote, setVoiceNote, delVoiceNote, blobToDataUrl } from '../lib/voicenote'
import { Hint } from '../components/Hint'
import type { ContextItem, ContextWhy, SectionContext } from '../types'

// The Context panel: research the author's own sources, pick the passages that
// should ground the drafting, and say why each one matters. One engine, two
// scopes — a SECTION's context (under the focus-mode brief) and a CHAPTER's
// context (under the big brief; its searches are steered by idea/purpose/
// outcome, and its picks ground every section draft in the chapter).
// The search is one honest, synchronous loop — search → read → write back to
// the graph — so the progress line narrates what is really happening.

const PHASES = ['Searching your sources…', 'Reading the passages…', 'Writing to your knowledge graph…']

/** Voice-note key for a why (separate namespace from section briefs). */
const whyKey = (itemId: string) => `why-${itemId}`

/** Everything the panel needs from its host — section or chapter. */
interface ContextScope {
  ctx: SectionContext
  add: (item: Omit<ContextItem, 'id' | 'addedAt'>) => void
  update: (itemId: string, patch: Partial<ContextItem>) => void
  remove: (itemId: string) => void
  setSearched: () => void
  /** What rides along with every search so results are scope-aware. */
  payload: { bookTitle?: string; chapterTitle?: string; sectionTitle?: string; brief?: string }
  /** What the panel is grounding — shown in the help line. */
  groundsLabel: string
}

type SR = { start: () => void; stop: () => void } & Record<string, unknown>

/** Live speech-to-text while recording, where the browser supports it. */
function makeRecognizer(onText: (t: string) => void): SR | null {
  const Ctor =
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  if (typeof Ctor !== 'function') return null
  const rec = new (Ctor as new () => SR)()
  rec.continuous = true
  rec.interimResults = false
  rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => {
    let text = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) text += e.results[i][0].transcript
    }
    if (text.trim()) onText(text.trim())
  }
  return rec
}

function WhyEditor({ item, onWhy }: { item: ContextItem; onWhy: (why: ContextWhy) => void }) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const srRef = useRef<SR | null>(null)
  const why = item.why ?? { text: '' }
  // Async callbacks (recorder stop, transcript chunks) must see the LATEST why,
  // not the render they were created in.
  const whyRef = useRef(why)
  whyRef.current = why

  useEffect(() => {
    let alive = true
    if (why.hasAudio) getVoiceNote(whyKey(item.id)).then((u) => alive && u && setAudioUrl(u))
    return () => {
      alive = false
    }
  }, [item.id, why.hasAudio])

  async function startRec() {
    setRecError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const url = await blobToDataUrl(blob)
        setAudioUrl(url)
        setVoiceNote(whyKey(item.id), url)
        onWhy({ ...whyRef.current, hasAudio: true })
        stream.getTracks().forEach((t) => t.stop())
      }
      // Transcribe live into the editable why text; the text stays canonical.
      const sr = makeRecognizer((t) => {
        const cur = whyRef.current
        onWhy({ ...cur, text: cur.text ? `${cur.text} ${t}` : t })
      })
      sr?.start()
      srRef.current = sr
      if (!sr) setRecError('Live transcription isn’t available in this browser — the audio is kept; please type the why.')
      mr.start()
      recRef.current = mr
      setRecording(true)
    } catch {
      setRecError('Microphone not available. You can type the why instead.')
    }
  }

  function stopRec() {
    recRef.current?.stop()
    try {
      srRef.current?.stop()
    } catch {
      /* recognizer may already have stopped itself */
    }
    setRecording(false)
  }

  function removeAudio() {
    delVoiceNote(whyKey(item.id))
    setAudioUrl(null)
    onWhy({ text: why.text, hasAudio: false })
  }

  return (
    <div className="ctx-why">
      <textarea
        className="ctx-why-text"
        rows={2}
        placeholder="Why does this passage matter here? Say it or type it…"
        value={why.text}
        onChange={(e) => onWhy({ ...why, text: e.target.value })}
      />
      <div className="ctx-why-voice">
        {!recording ? (
          <Hint text="Record why this matters — it transcribes as you speak">
            <button className="btn ghost" onClick={startRec}>● Say why</button>
          </Hint>
        ) : (
          <button className="btn primary" onClick={stopRec}>■ Stop</button>
        )}
        {audioUrl && !recording && (
          <>
            <audio controls src={audioUrl} className="ctx-why-audio" />
            <button className="btn ghost" onClick={removeAudio}>Delete audio</button>
          </>
        )}
      </div>
      {recError && <p className="ctx-err">{recError}</p>}
    </div>
  )
}

/** Listen to the exact seconds of the episode this chunk transcribes. The
 *  media-fragment (#t=start,end) seeks on hosts that honor it; the timeupdate
 *  guard stops at the chunk's end either way. preload=none — nothing loads
 *  until the author presses play. */
function SnippetPlayer({ audioUrl, startSec, endSec }: { audioUrl: string; startSec?: number; endSec?: number }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const start = Math.max(0, Math.floor(startSec ?? 0))
  const src = `${audioUrl}#t=${start}${endSec ? `,${Math.ceil(endSec)}` : ''}`
  return (
    <audio
      ref={ref}
      className="ctx-snippet"
      controls
      preload="none"
      src={src}
      onPlay={() => {
        const a = ref.current
        // hosts that ignore the fragment start at 0 — seek ourselves
        if (a && start && a.currentTime < start - 2) a.currentTime = start
      }}
      onTimeUpdate={() => {
        const a = ref.current
        if (a && endSec && a.currentTime >= endSec) a.pause()
      }}
    />
  )
}

/** Read more of a book passage, in place. Expansion fetches the chunk's
 *  surrounding SEGMENTS (sentence-sized, contiguous, chapter-clipped) from the
 *  gateway; each click widens the window. When `onHighlights` is given the
 *  sentences toggle on click — the author marks the exact lines that matter,
 *  and those are quoted verbatim in the draft prompt. */
function ChunkReader({
  chunkId,
  highlights,
  onHighlights,
}: {
  chunkId: string
  highlights?: string[]
  onHighlights?: (next: string[]) => void
}) {
  const [segments, setSegments] = useState<ExpandSegment[] | null>(null)
  const [window_, setWindow] = useState(12)
  const [more, setMore] = useState({ before: false, after: false })
  const [pages, setPages] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const hl = new Set(highlights ?? [])

  async function load(w: number) {
    if (busy) return
    setBusy(true)
    setNote(null)
    try {
      const r = await expandChunk({ chunkId, window: w })
      if (r.mode === 'demo' || !r.ok || !r.segments) {
        setNote(r.error || 'Reading around this passage needs the live connection.')
      } else {
        setSegments(r.segments)
        setWindow(w)
        setMore({ before: !!r.hasMoreBefore, after: !!r.hasMoreAfter })
        setPages(
          r.pageStart != null
            ? r.pageEnd != null && r.pageEnd !== r.pageStart
              ? `pp. ${r.pageStart}–${r.pageEnd}`
              : `p. ${r.pageStart}`
            : null,
        )
      }
    } catch {
      setNote('Reading around this passage isn’t available right now.')
    } finally {
      setBusy(false)
    }
  }

  function toggle(text: string) {
    if (!onHighlights) return
    const next = new Set(hl)
    if (next.has(text)) next.delete(text)
    else next.add(text)
    // keep reading order: filter the segment list, not insertion order
    const ordered = (segments ?? []).map((s) => s.text).filter((t) => next.has(t))
    // highlights made before this expansion (or beyond it) stay
    const outside = [...next].filter((t) => !(segments ?? []).some((s) => s.text === t))
    onHighlights([...outside, ...ordered])
  }

  return (
    <div className="ctx-reader">
      {segments && (
        <p className={`ctx-reader-text${onHighlights ? ' picking' : ''}`}>
          {segments.map((s) => (
            <span
              key={s.seq}
              className={`ctx-seg${s.in_chunk ? ' in' : ''}${hl.has(s.text) ? ' hl' : ''}`}
              onClick={() => toggle(s.text)}
            >
              {s.text}{' '}
            </span>
          ))}
        </p>
      )}
      {segments && onHighlights && (
        <p className="ctx-reader-hint">Click a sentence to highlight what matters — highlighted lines are quoted in the draft.</p>
      )}
      <div className="ctx-reader-foot">
        <button
          className="btn ghost"
          disabled={busy || (!!segments && !more.before && !more.after)}
          onClick={() => load(segments ? window_ + 16 : 12)}
        >
          {busy ? 'Loading…' : segments ? (more.before || more.after ? 'Read more' : 'Whole chapter shown') : onHighlights ? 'Read & highlight' : 'Read more'}
        </button>
        {pages && <span className="ctx-source">{pages}</span>}
      </div>
      {note && <p className="brief-note">{note}</p>}
    </div>
  )
}

function ContextPanelBase({ scope }: { scope: ContextScope }) {
  const addResource = useBookStore((s) => s.addResource)
  const ctx = scope.ctx

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState(0)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [srcTitle, setSrcTitle] = useState('')
  const [srcText, setSrcText] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [advBusy, setAdvBusy] = useState(false)
  const [advMode, setAdvMode] = useState<AdvancedMode>('routes')
  const [advResult, setAdvResult] = useState<AdvancedResult | null>(null)

  // Narrate the synchronous loop while the request is in flight.
  useEffect(() => {
    if (!busy) return
    setPhase(0)
    const t = window.setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 4000)
    return () => window.clearInterval(t)
  }, [busy])

  async function runSearch() {
    if (!query.trim() || busy) return
    setBusy(true)
    setNotice(null)
    setResult(null)
    try {
      const res = await researchSection({ query: query.trim(), ...scope.payload })
      setResult(res)
      scope.setSearched()
      if (res.mode === 'demo') {
        setNotice(
          'Showing demo results — connect the research service to search your real books and videos. Everything else works: pick a passage and say why it matters.',
        )
      } else if (res.written) {
        setNotice(
          `Your graph grew: ${res.written.nodes} ideas and ${res.written.edges} connections from this search.`,
        )
      }
    } catch {
      setNotice('Research isn’t reachable right now. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  function pick(chunkId: string) {
    const c = result?.chunks.find((x) => x.chunkId === chunkId)
    if (!c) return
    scope.add({
      kind: 'chunk',
      refId: c.chunkId,
      excerpt: c.text,
      source: c.source,
      sourceType: c.sourceType,
      ...(c.audioUrl ? { audioUrl: c.audioUrl, startSec: c.startSec, endSec: c.endSec } : {}),
      fromQuery: query.trim(),
    })
  }

  /** Which per-kind affordance a chunk gets. Demo fixtures have no live data
   *  behind them, so book expansion is hidden there. */
  const canExpand = (c: { sourceType?: string; chunkId: string }) =>
    c.sourceType === 'book' && !c.chunkId.startsWith('demo-')

  async function runAdvanced(mode: AdvancedMode) {
    if (advBusy) return
    setAdvMode(mode)
    setAdvBusy(true)
    setAdvResult(null)
    try {
      setAdvResult(
        await advancedSearch({
          mode,
          seeds: (result?.entities ?? []).map((e) => ({ nodeId: e.nodeId, name: e.name })),
          sectionTitle: scope.payload.sectionTitle || scope.payload.chapterTitle,
          brief: scope.payload.brief,
        }),
      )
    } catch {
      setAdvResult({ mode: 'demo', findings: [], note: 'Graph search isn’t reachable right now.' })
    } finally {
      setAdvBusy(false)
    }
  }

  const findingRef = (title: string) => `finding-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`

  function pickFinding(f: { title: string; detail: string; chunks: { chunkId: string; sourceId: string; quote: string }[] }) {
    const quotes = f.chunks.filter((c) => c.quote).map((c) => `“${c.quote}”`)
    scope.add({
      kind: 'finding',
      refId: findingRef(f.title),
      excerpt: [f.title, f.detail, ...quotes].filter(Boolean).join(' — '),
      source: `Graph insight · ${advMode}`,
      fromQuery: advMode,
    })
  }

  function addSource() {
    if (!srcText.trim()) return
    const title = srcTitle.trim() || 'Pasted source'
    const resId = addResource({ title, kind: 'paste', text: srcText.trim() })
    scope.add({ kind: 'resource', refId: resId, excerpt: srcText.trim().slice(0, 280), source: title })
    setSrcTitle('')
    setSrcText('')
    setSourceOpen(false)
  }

  const picked = new Set(ctx.items.map((x) => x.refId))

  return (
    <div className={`ctx${open ? ' open' : ''}`}>
      <button className="brief-toggle" onClick={() => setOpen((o) => !o)}>
        <span>
          📚 Context{ctx.items.length ? ` · ${ctx.items.length} source${ctx.items.length > 1 ? 's' : ''}` : ''}
        </span>
        <span className="brief-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="brief-body">
          <p className="brief-help">
            Search your own books, videos and notes for passages that should ground {scope.groundsLabel}.
            Pick the ones that matter and say why — the draft cites them, and every search grows
            your knowledge graph.
          </p>

          <div className="ctx-search">
            <input
              className="ctx-query"
              placeholder="What are you looking for? e.g. why members stay…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
            <button className="btn primary" onClick={runSearch} disabled={busy || !query.trim()}>
              {busy ? 'Researching…' : 'Research'}
            </button>
            <Hint text={ctx.searched ? 'Graph search — routes, bridges, gaps in your knowledge base' : 'Run a research search first'}>
              <button
                className={`btn ghost ctx-adv${advOpen ? ' on' : ''}`}
                disabled={!ctx.searched}
                onClick={() => setAdvOpen((o) => !o)}
              >
                Advanced {ctx.searched ? (advOpen ? '▾' : '▸') : '🔒'}
              </button>
            </Hint>
          </div>

          {advOpen && ctx.searched && (
            <div className="ctx-advanced">
              <div className="ctx-adv-modes">
                {(
                  [
                    ['routes', 'Routes', 'How do two of these ideas connect?'],
                    ['expand', 'Map', 'What surrounds these ideas?'],
                    ['influential', 'Bridges', 'Which ideas does your book route through?'],
                    ['gaps', 'Gaps', 'Which themes haven’t you connected yet?'],
                  ] as [AdvancedMode, string, string][]
                ).map(([m, label, hint]) => (
                  <Hint key={m} text={hint}>
                    <button
                      className={`btn ghost${advMode === m && advResult ? ' on' : ''}`}
                      disabled={advBusy}
                      onClick={() => runAdvanced(m)}
                    >
                      {label}
                    </button>
                  </Hint>
                ))}
              </div>
              {advBusy && (
                <p className="ctx-progress">
                  <span className="ctx-spinner" /> Searching your knowledge graph…
                </p>
              )}
              {advResult && !advBusy && (
                <div className="ctx-results">
                  {advResult.mode === 'demo' && (
                    <p className="brief-note">Demo graph insights — connect the research service for the real thing.</p>
                  )}
                  {advResult.note && <p className="brief-note">{advResult.note}</p>}
                  {advResult.findings.map((f) => (
                    <div key={f.title} className="ctx-hit ctx-finding">
                      <p className="ctx-hit-text"><strong>{f.title}</strong></p>
                      <p className="ctx-finding-detail">{f.detail}</p>
                      {f.chunks.filter((c) => c.quote).map((c) => (
                        <p key={c.chunkId} className="ctx-finding-quote">“{c.quote}”</p>
                      ))}
                      <div className="ctx-hit-foot">
                        <span className="ctx-source">Graph insight · {advMode}</span>
                        {picked.has(findingRef(f.title)) ? (
                          <span className="ctx-picked">In context ✓</span>
                        ) : (
                          <button className="btn ghost" onClick={() => pickFinding(f)}>+ Add to context</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {busy && (
            <p className="ctx-progress">
              <span className="ctx-spinner" /> {PHASES[phase]}
            </p>
          )}
          {notice && <p className="brief-note">{notice}</p>}

          {result && !busy && (
            <div className="ctx-results">
              {result.entities.length > 0 && (
                <div className="ctx-chips">
                  {result.entities.map((e) => (
                    <span key={e.nodeId} className="ctx-chip" title={e.type}>{e.name}</span>
                  ))}
                </div>
              )}
              {result.chunks.map((c) => (
                <div key={c.chunkId} className="ctx-hit">
                  <p className="ctx-hit-text">{c.text}</p>
                  {c.audioUrl && <SnippetPlayer audioUrl={c.audioUrl} startSec={c.startSec} endSec={c.endSec} />}
                  {canExpand(c) && <ChunkReader chunkId={c.chunkId} />}
                  <div className="ctx-hit-foot">
                    <span className="ctx-source" title={c.source}>{c.source}</span>
                    {picked.has(c.chunkId) ? (
                      <span className="ctx-picked">In context ✓</span>
                    ) : (
                      <button className="btn ghost" onClick={() => pick(c.chunkId)}>+ Add to context</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ctx.items.length > 0 && (
            <div className="ctx-items">
              <div className="ctx-items-head">Grounding {scope.groundsLabel}</div>
              {ctx.items.map((it) => (
                <div key={it.id} className="ctx-item">
                  <p className="ctx-item-excerpt">“{it.excerpt}”</p>
                  {it.audioUrl && <SnippetPlayer audioUrl={it.audioUrl} startSec={it.startSec} endSec={it.endSec} />}
                  {it.kind === 'chunk' && canExpand({ sourceType: it.sourceType, chunkId: it.refId }) && (
                    <ChunkReader
                      chunkId={it.refId}
                      highlights={it.highlights}
                      onHighlights={(next) => scope.update(it.id, { highlights: next })}
                    />
                  )}
                  {!!it.highlights?.length && (
                    <div className="ctx-highlights">
                      {it.highlights.map((h) => (
                        <p key={h} className="ctx-highlight">✦ {h}</p>
                      ))}
                    </div>
                  )}
                  <div className="ctx-hit-foot">
                    <span className="ctx-source" title={it.source}>{it.source}</span>
                    <button className="draft-x" title="Remove from context" onClick={() => scope.remove(it.id)}>✕</button>
                  </div>
                  <WhyEditor item={it} onWhy={(w) => scope.update(it.id, { why: w })} />
                </div>
              ))}
            </div>
          )}

          <div className="ctx-addsource">
            {!sourceOpen ? (
              <button className="btn ghost" onClick={() => setSourceOpen(true)}>+ Add a source</button>
            ) : (
              <div className="ctx-src-form">
                <input
                  className="ctx-query"
                  placeholder="Source name (book, article, note…)"
                  value={srcTitle}
                  onChange={(e) => setSrcTitle(e.target.value)}
                />
                <textarea
                  className="brief-text"
                  rows={3}
                  placeholder="Paste the text of the source…"
                  value={srcText}
                  onChange={(e) => setSrcText(e.target.value)}
                />
                <div className="ctx-src-actions">
                  <button className="btn primary" onClick={addSource} disabled={!srcText.trim()}>Add to context</button>
                  <button className="btn ghost" onClick={() => setSourceOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** ONE panel, two owners. The engine and every affordance (research, advanced
 *  graph search, read-more, highlights, snippets, whys) are identical at both
 *  levels — the owner decides only where items persist and which brief steers
 *  the search: the section's own brief, or the chapter's big brief. */
export function ContextPanel({ owner }: { owner: ContextOwner }) {
  const book = useBookStore((s) => currentBook(s))
  const addItem = useBookStore((s) => s.addContextItem)
  const updateItem = useBookStore((s) => s.updateContextItem)
  const removeItem = useBookStore((s) => s.removeContextItem)
  const setSearched = useBookStore((s) => s.setContextSearched)

  const section = owner.kind === 'section' ? book.sections.find((x) => x.id === owner.id) : undefined
  const chapter =
    owner.kind === 'section'
      ? book.chapters.find((c) => c.id === section?.chapterId)
      : book.chapters.find((c) => c.id === owner.id)

  let ctx: SectionContext
  let payload: ContextScope['payload']
  let groundsLabel: string
  if (owner.kind === 'section') {
    ctx = section?.context ?? { items: [], searched: false }
    payload = {
      bookTitle: book.title,
      chapterTitle: chapter?.title,
      sectionTitle: section?.title || section?.label,
      brief: section?.brief,
    }
    groundsLabel = 'this section'
  } else {
    const ws = chapter?.workspace
    ctx = ws?.context ?? { items: [], searched: false }
    // The big brief IS the search context: idea, purpose, outcome, notes.
    const brief = [
      ws?.idea && `Idea: ${ws.idea}`,
      ws?.purpose && `Purpose: ${ws.purpose}`,
      ws?.outcome && `Outcome for the reader: ${ws.outcome}`,
      ws?.notes && `Notes: ${ws.notes}`,
    ]
      .filter(Boolean)
      .join('\n')
    payload = { bookTitle: book.title, chapterTitle: chapter?.title, brief }
    groundsLabel = 'this whole chapter'
  }

  return (
    <ContextPanelBase
      scope={{
        ctx,
        add: (item) => addItem(owner, item),
        update: (id, patch) => updateItem(owner, id, patch),
        remove: (id) => removeItem(owner, id),
        setSearched: () => setSearched(owner),
        payload,
        groundsLabel,
      }}
    />
  )
}
