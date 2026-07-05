import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentBook, useBookStore } from '../store/useBookStore'
import { interviewTurn } from '../lib/research'

// "Teach the Brain" — a guided interview that seeds the author's knowledge
// base. Every answer is ingested as a source and mined for entities and
// relationships (grounded in the answer's own words), so the graph grows from
// the author's thinking before a single section is drafted.

interface Turn {
  role: 'author' | 'interviewer'
  text: string
  stored?: { nodes: number; edges: number; claims: number } | null
}

export function TeachBrain() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const [turns, setTurns] = useState<Turn[]>([])
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Opening question.
  useEffect(() => {
    let alive = true
    setBusy(true)
    interviewTurn({ history: [], bookTitle: book.title }).then((r) => {
      if (!alive) return
      setDemo(r.mode === 'demo')
      setTurns([{ role: 'interviewer', text: r.question }])
      setBusy(false)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, busy])

  async function send() {
    const text = answer.trim()
    if (!text || busy) return
    setAnswer('')
    const history: Turn[] = [...turns, { role: 'author', text }]
    setTurns(history)
    setBusy(true)
    try {
      const r = await interviewTurn({
        history: history.map(({ role, text: t }) => ({ role, text: t })),
        bookTitle: book.title,
      })
      setDemo(r.mode === 'demo')
      setTurns([...history, { role: 'interviewer', text: r.question, stored: r.stored }])
    } catch {
      setTurns([...history, { role: 'interviewer', text: 'Something went wrong on my side — say that again?' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page teach">
      <header className="teach-head">
        <div>
          <h1>🧠 Teach the brain</h1>
          <p>
            Talk about your book. Everything you say becomes searchable knowledge — stories, beliefs and
            practices your drafts can be grounded in.
          </p>
        </div>
        <button className="btn ghost" onClick={() => navigate('/about')}>← Foundation</button>
      </header>

      {demo && (
        <p className="brief-note">
          Demo mode — the conversation works, but nothing is saved to your knowledge base until the research
          service is connected.
        </p>
      )}

      <div className="teach-chat">
        {turns.map((t, i) => (
          <div key={i} className={`teach-turn ${t.role}`}>
            <p>{t.text}</p>
            {t.stored && (t.stored.nodes || t.stored.edges || t.stored.claims) ? (
              <span className="teach-stored">
                🌱 saved: {t.stored.nodes} ideas · {t.stored.edges} connections · {t.stored.claims} claims
              </span>
            ) : null}
          </div>
        ))}
        {busy && (
          <div className="teach-turn interviewer">
            <p className="ctx-progress"><span className="ctx-spinner" /> listening, saving, thinking…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="teach-compose">
        <textarea
          rows={3}
          placeholder="Answer in your own words — stories and specifics are gold…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
        />
        <button className="btn primary" onClick={send} disabled={busy || !answer.trim()}>
          Send
        </button>
      </div>
    </main>
  )
}
