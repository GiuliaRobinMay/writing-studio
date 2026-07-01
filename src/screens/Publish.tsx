import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentBook, emptyPublish, useBookStore } from '../store/useBookStore'
import { META_FIELDS, PUBLISH_ITEM_COUNT, PUBLISH_STAGES, type PublishItem } from '../data/publish'
import { countWords, estimatePages } from '../lib/text'
import { BOOK_STATUS_META } from '../lib/status'
import type { PublishMeta } from '../types'

function MetaField({ id, label, hint, long, value, onCommit }: { id: string; label: string; hint?: string; long?: boolean; value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => v !== value && onCommit(v)
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {hint && <em className="meta-hint"> — {hint}</em>}
      </span>
      {long ? (
        <textarea id={id} rows={id === 'description' ? 4 : 2} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} />
      ) : (
        <input id={id} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} />
      )}
    </label>
  )
}

export function Publish() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const sections = useBookStore((s) => currentBook(s).sections)
  const setPublishDone = useBookStore((s) => s.setPublishDone)
  const updatePublishMeta = useBookStore((s) => s.updatePublishMeta)

  const pub = book.publish ?? emptyPublish()

  const stats = useMemo(() => {
    let words = 0
    for (const s of sections) words += countWords(s.body)
    const finished = chapters.filter((c) => c.status === 'finished').length
    return { words, pages: estimatePages(words), finished, chapters: chapters.length }
  }, [sections, chapters])

  const doneCount = PUBLISH_STAGES.reduce((n, st) => n + st.items.filter((it) => pub.done[it.id]).length, 0)
  const pct = Math.round((doneCount / PUBLISH_ITEM_COUNT) * 100)
  const m = BOOK_STATUS_META[book.status] ?? BOOK_STATUS_META.writing

  function Check({ item }: { item: PublishItem }) {
    const done = !!pub.done[item.id]
    return (
      <div className="pub-item">
        <button className={`pub-check${done ? ' on' : ''}`} onClick={() => setPublishDone(item.id, !done)} aria-pressed={done}>
          {done ? '✓' : ''}
        </button>
        <div className="pub-item-body">
          <span className={`pub-item-label${done ? ' done' : ''}`}>{item.label}</span>
          {item.hint && <span className="pub-item-hint">{item.hint}</span>}
        </div>
        {item.action === 'export' && (
          <button className="btn ghost pub-action" onClick={() => navigate('/read')}>
            Export ↗
          </button>
        )}
      </div>
    )
  }

  return (
    <main className="page publish">
      <div className="page-head">
        <h1>Publish</h1>
        <div className="theme">Your guided path from finished manuscript to a self-published book — and a launch that can win a bestseller badge.</div>
      </div>

      <section className="summary">
        <div className="stat">
          <div className="num">{pct}%</div>
          <div className="lbl">Ready to publish</div>
        </div>
        <div className="stat">
          <div className="num">{stats.finished}/{stats.chapters}</div>
          <div className="lbl">Chapters finished</div>
        </div>
        <div className="stat">
          <div className="num">{stats.words.toLocaleString()}</div>
          <div className="lbl">Words · ~{stats.pages} pages</div>
        </div>
        <div className="progress-track">
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="cap">
            {doneCount} of {PUBLISH_ITEM_COUNT} steps done · status{' '}
            <span className="pub-book-status" style={{ color: m.color }}>{m.label}</span>
          </div>
        </div>
      </section>

      {PUBLISH_STAGES.map((stage, i) => {
        const stageDone = stage.items.filter((it) => pub.done[it.id]).length
        return (
          <section className="card pub-stage" key={stage.key}>
            <div className="pub-stage-head">
              <div>
                <h2 className="card-title">
                  <span className="pub-stage-num">{i + 1}</span> {stage.title}
                </h2>
                <div className="row-sub">{stage.blurb}</div>
              </div>
              <span className={`pub-stage-count${stageDone === stage.items.length ? ' complete' : ''}`}>
                {stageDone}/{stage.items.length}
              </span>
            </div>

            <div className="pub-items">
              {stage.items.map((it) => (
                <Check key={it.id} item={it} />
              ))}
            </div>

            {stage.key === 'package' && (
              <div className="pub-meta">
                <div className="pub-meta-head">Book details for KDP</div>
                <div className="field-grid">
                  {META_FIELDS.map((f) => (
                    <MetaField
                      key={f.id}
                      id={f.id}
                      label={f.label}
                      hint={f.hint}
                      long={f.long}
                      value={pub.meta[f.id as keyof PublishMeta]}
                      onCommit={(v) => updatePublishMeta({ [f.id]: v } as Partial<PublishMeta>)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )
      })}

      <p className="note pub-foot">
        The app prepares and guides — you upload the final files in Amazon KDP (there’s no publishing API).
        Once you’re live, the six-month <strong>Sell</strong> phase keeps the book selling — that’s coming next.
      </p>
    </main>
  )
}
