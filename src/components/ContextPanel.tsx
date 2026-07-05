import { useEffect, useRef, useState } from 'react'
import { currentBook, useBookStore } from '../store/useBookStore'
import {
  advancedSearch,
  researchSection,
  type AdvancedMode,
  type AdvancedResult,
  type ResearchResult,
} from '../lib/research'
import { getVoiceNote, setVoiceNote, delVoiceNote, blobToDataUrl } from '../lib/voicenote'
import { Hint } from '../components/Hint'
import type { ContextItem } from '../types'

// The Context panel: research the author's own sources for THIS section, pick
// the passages that should ground the draft, and say why each one matters.
// The search is one honest, synchronous loop — search → read → write back to
// the graph — so the progress line narrates what is really happening.

const PHASES = ['Searching your sources…', 'Reading the passages…', 'Writing to your knowledge graph…']

/** Voice-note key for a why (separate namespace from section briefs). */
const whyKey = (itemId: string) => `why-${itemId}`

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

function WhyEditor({ sectionId, item }: { sectionId: string; item: ContextItem }) {
  const updateWhy = useBookStore((s) => s.updateContextWhy)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const srRef = useRef<SR | null>(null)
  const why = item.why ?? { text: '' }

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
        const cur = useBookStore.getState()
        const sec = currentBook(cur).sections.find((s) => s.id === sectionId)
        const latest = sec?.context?.items.find((x) => x.id === item.id)?.why ?? { text: '' }
        updateWhy(sectionId, item.id, { ...latest, hasAudio: true })
        stream.getTracks().forEach((t) => t.stop())
      }
      // Transcribe live into the editable why text; the text stays canonical.
      const sr = makeRecognizer((t) => {
        const cur = useBookStore.getState()
        const sec = currentBook(cur).sections.find((s) => s.id === sectionId)
        const latest = sec?.context?.items.find((x) => x.id === item.id)?.why ?? { text: '' }
        updateWhy(sectionId, item.id, {
          ...latest,
          text: latest.text ? `${latest.text} ${t}` : t,
        })
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
    updateWhy(sectionId, item.id, { text: why.text, hasAudio: false })
  }

  return (
    <div className="ctx-why">
      <textarea
        className="ctx-why-text"
        rows={2}
        placeholder="Why does this passage matter for this section? Say it or type it…"
        value={why.text}
        onChange={(e) => updateWhy(sectionId, item.id, { ...why, text: e.target.value })}
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

export function ContextPanel({ sectionId }: { sectionId: string }) {
  const book = useBookStore((s) => currentBook(s))
  const section = book.sections.find((x) => x.id === sectionId)
  const chapter = book.chapters.find((c) => c.id === section?.chapterId)
  const ctx = section?.context ?? { items: [], searched: false }

  const addItem = useBookStore((s) => s.addContextItem)
  const removeItem = useBookStore((s) => s.removeContextItem)
  const setSearched = useBookStore((s) => s.setContextSearched)
  const addResource = useBookStore((s) => s.addResource)

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
      const res = await researchSection({
        query: query.trim(),
        bookTitle: book.title,
        chapterTitle: chapter?.title,
        sectionLabel: section?.label,
        sectionTitle: section?.title,
        brief: section?.brief,
      })
      setResult(res)
      setSearched(sectionId)
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
    addItem(sectionId, {
      kind: 'chunk',
      refId: c.chunkId,
      excerpt: c.text,
      source: c.source,
      fromQuery: query.trim(),
    })
  }

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
          sectionTitle: section?.title || section?.label,
          brief: section?.brief,
        }),
      )
    } catch {
      setAdvResult({ mode: 'demo', findings: [], note: 'Graph search isn’t reachable right now.' })
    } finally {
      setAdvBusy(false)
    }
  }

  function pickFinding(f: { title: string; detail: string; chunks: { chunkId: string; sourceId: string; quote: string }[] }) {
    const quotes = f.chunks.filter((c) => c.quote).map((c) => `“${c.quote}”`)
    addItem(sectionId, {
      kind: 'finding',
      refId: `finding-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
      excerpt: [f.title, f.detail, ...quotes].filter(Boolean).join(' — '),
      source: `Graph insight · ${advMode}`,
      fromQuery: advMode,
    })
  }

  function addSource() {
    if (!srcText.trim()) return
    const title = srcTitle.trim() || 'Pasted source'
    const resId = addResource({ title, kind: 'paste', text: srcText.trim() })
    addItem(sectionId, {
      kind: 'resource',
      refId: resId,
      excerpt: srcText.trim().slice(0, 280),
      source: title,
    })
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
            Search your own books, videos and notes for passages that should ground this section.
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
                        {picked.has(`finding-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`) ? (
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
                  <div className="ctx-hit-foot">
                    <span className="ctx-source">{c.source}</span>
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
              <div className="ctx-items-head">Grounding this section</div>
              {ctx.items.map((it) => (
                <div key={it.id} className="ctx-item">
                  <p className="ctx-item-excerpt">“{it.excerpt}”</p>
                  <div className="ctx-hit-foot">
                    <span className="ctx-source">{it.source}</span>
                    <button className="draft-x" title="Remove from context" onClick={() => removeItem(sectionId, it.id)}>✕</button>
                  </div>
                  <WhyEditor sectionId={sectionId} item={it} />
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
