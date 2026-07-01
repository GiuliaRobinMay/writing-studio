import { useEffect, useState } from 'react'
import { currentBook, emptyGrow, useBookStore } from '../store/useBookStore'
import { GROW_ITEM_COUNT, GROW_METRICS, GROW_WAVES, type GrowItem } from '../data/grow'
import type { GrowPlan } from '../types'

let counter = 0
const nid = () => `off-${Date.now().toString(36)}-${(counter += 1)}`

function MetricField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input
      className="grow-metric-input"
      value={v}
      placeholder="—"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
    />
  )
}

export function Grow() {
  const grow: GrowPlan = useBookStore((s) => currentBook(s).grow) ?? emptyGrow()
  const update = useBookStore((s) => s.updateGrow)

  const doneCount = GROW_WAVES.reduce((n, w) => n + w.items.filter((it) => grow.done[it.id]).length, 0)
  const pct = Math.round((doneCount / GROW_ITEM_COUNT) * 100)

  function Check({ item }: { item: GrowItem }) {
    const done = !!grow.done[item.id]
    return (
      <div className="pub-item">
        <button className={`pub-check${done ? ' on' : ''}`} onClick={() => update({ done: { ...grow.done, [item.id]: !done } })} aria-pressed={done}>
          {done ? '✓' : ''}
        </button>
        <div className="pub-item-body">
          <span className={`pub-item-label${done ? ' done' : ''}`}>{item.label}</span>
          {item.hint && <span className="pub-item-hint">{item.hint}</span>}
        </div>
      </div>
    )
  }

  return (
    <main className="page publish grow">
      <div className="page-head">
        <h1>Grow</h1>
        <div className="theme">Most books peak at launch and fade. This is the six-month tour that keeps yours selling — and turns readers into your community and your next work.</div>
      </div>

      {/* Metrics */}
      <section className="card">
        <h2 className="card-title">The numbers worth watching</h2>
        <p className="row-sub" style={{ marginBottom: 14 }}>Update these weekly. Watch the trend, not the hourly rank.</p>
        <div className="grow-metrics">
          {GROW_METRICS.map((mt) => (
            <div className="grow-metric" key={mt.id}>
              <div className="grow-metric-label">{mt.label}</div>
              <MetricField value={grow.metrics[mt.id] ?? ''} onCommit={(v) => update({ metrics: { ...grow.metrics, [mt.id]: v } })} />
              <div className="grow-metric-hint">{mt.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The tour */}
      <section className="summary" style={{ marginBottom: 22 }}>
        <div className="stat">
          <div className="num">{pct}%</div>
          <div className="lbl">Tour underway</div>
        </div>
        <div className="progress-track">
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="cap">{doneCount} of {GROW_ITEM_COUNT} tour actions done · six months of momentum</div>
        </div>
      </section>

      {GROW_WAVES.map((wave, i) => {
        const waveDone = wave.items.filter((it) => grow.done[it.id]).length
        return (
          <section className="card pub-stage" key={wave.key}>
            <div className="pub-stage-head">
              <div>
                <h2 className="card-title">
                  <span className="pub-stage-num">{i + 1}</span> {wave.title}
                </h2>
                <div className="row-sub">{wave.blurb}</div>
              </div>
              <span className={`pub-stage-count${waveDone === wave.items.length ? ' complete' : ''}`}>
                {waveDone}/{wave.items.length}
              </span>
            </div>
            <div className="pub-items">
              {wave.items.map((it) => (
                <Check key={it.id} item={it} />
              ))}
            </div>
          </section>
        )
      })}

      {/* The flywheel */}
      <section className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="card-title" style={{ margin: 0 }}>The flywheel — your book as front door</h2>
          <button className="btn primary" onClick={() => update({ offers: [...grow.offers, { id: nid(), name: '', note: '' }] })}>+ Add offer</button>
        </div>
        <p className="row-sub" style={{ marginBottom: 12 }}>
          The book is the most generous thing you sell — the entry point to everything else. Mention one at a time, at the right moment.
        </p>
        <div className="grow-offers">
          {grow.offers.map((o) => (
            <div className="grow-offer" key={o.id}>
              <input className="grow-offer-name" placeholder="Offer — course, retreat, service…" value={o.name} onChange={(e) => update({ offers: grow.offers.map((x) => (x.id === o.id ? { ...x, name: e.target.value } : x)) })} />
              <input className="grow-offer-note" placeholder="When / how you’ll point readers to it…" value={o.note} onChange={(e) => update({ offers: grow.offers.map((x) => (x.id === o.id ? { ...x, note: e.target.value } : x)) })} />
              <button className="ref-del" title="Remove" onClick={() => update({ offers: grow.offers.filter((x) => x.id !== o.id) })}>✕</button>
            </div>
          ))}
          {grow.offers.length === 0 && <p className="empty">No offers yet. What does a reader who loved the book do next?</p>}
        </div>
      </section>

      <p className="note pub-foot">
        When Claude is connected, Grow can <strong>generate a tailored six-month plan</strong> from your book’s Foundation and launch date — the kind of full campaign we built for Swaane.
      </p>
    </main>
  )
}
