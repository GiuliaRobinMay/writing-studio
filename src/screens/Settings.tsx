import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentBook, useBookStore } from '../store/useBookStore'
import { DEFAULT_VOICE } from '../data/seed'
import { BOOK_STATUS_META, BOOK_STATUS_ORDER } from '../lib/status'
import { mix } from '../lib/color'
import { resizeImageFile } from '../lib/image'
import { brainHealth, brainSearch, type BrainChunk } from '../lib/brain'
import type { BookStatus } from '../types'

const FONTS = [
  { label: 'Georgia (default)', value: 'Georgia, serif' },
  { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: 'Iowan / Charter', value: '"Iowan Old Style", Charter, Georgia, serif' },
  { label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'System Sans', value: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
]

const ACCENTS = ['#8B5A3C', '#A8553A', '#9C6B2E', '#6E5A8B', '#3E7C6A', '#B04A4A', '#4A6FA5', '#3A3631']

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const settings = useBookStore((s) => currentBook(s).settings)
  const references = useBookStore((s) => currentBook(s).references)
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const templates = useBookStore((s) => currentBook(s).templates)
  const bookCount = useBookStore((s) => s.books.length)

  const updateBook = useBookStore((s) => s.updateBook)
  const updateSettings = useBookStore((s) => s.updateSettings)
  const addReference = useBookStore((s) => s.addReference)
  const updateReference = useBookStore((s) => s.updateReference)
  const removeReference = useBookStore((s) => s.removeReference)
  const removeBook = useBookStore((s) => s.removeBook)
  const setBookStatus = useBookStore((s) => s.setBookStatus)
  const setBookCover = useBookStore((s) => s.setBookCover)
  const coverRef = useRef<HTMLInputElement>(null)

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setBookCover(book.id, await resizeImageFile(file))
    } catch {
      /* ignore bad image */
    }
    e.target.value = ''
  }

  // ── Brain connection (read-only) ──
  const [brainStatus, setBrainStatus] = useState<{ testing?: boolean; mode?: string; message?: string; error?: string }>({})
  const [brainQuery, setBrainQuery] = useState('')
  const [brainResults, setBrainResults] = useState<BrainChunk[] | null>(null)
  const [brainSearching, setBrainSearching] = useState(false)

  async function testBrain() {
    setBrainStatus({ testing: true })
    try {
      const h = await brainHealth(settings.brain.endpoint)
      updateSettings({ brain: { ...settings.brain, connected: h.ok } })
      setBrainStatus({ mode: h.mode, message: h.message })
    } catch {
      updateSettings({ brain: { ...settings.brain, connected: false } })
      setBrainStatus({ error: `Couldn’t reach the brain service at ${settings.brain.endpoint || 'http://localhost:5274'}. Is it running?` })
    }
  }

  async function searchBrain() {
    if (!brainQuery.trim()) return
    setBrainSearching(true)
    setBrainResults(null)
    try {
      const r = await brainSearch(brainQuery, settings.brain.endpoint)
      setBrainResults(r.results)
      if (!brainStatus.mode) setBrainStatus({ mode: r.mode })
    } catch {
      setBrainResults([])
      setBrainStatus((s) => ({ ...s, error: 'Search failed — is the brain service running?' }))
    } finally {
      setBrainSearching(false)
    }
  }
  const addTemplate = useBookStore((s) => s.addTemplate)
  const updateTemplateName = useBookStore((s) => s.updateTemplateName)
  const removeTemplate = useBookStore((s) => s.removeTemplate)
  const addTemplatePart = useBookStore((s) => s.addTemplatePart)
  const updateTemplatePart = useBookStore((s) => s.updateTemplatePart)
  const removeTemplatePart = useBookStore((s) => s.removeTemplatePart)
  const resetToSeed = useBookStore((s) => s.resetToSeed)

  return (
    <main className="page settings">
      <div className="page-head">
        <h1>Settings</h1>
        <div className="theme">Shape how the studio looks, sounds, and what it draws from.</div>
      </div>

      {/* ── Book meta ──────────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">This book</h2>
        <div className="cover-field">
          <div
            className="cover-preview"
            style={
              book.cover
                ? { backgroundImage: `url(${book.cover})` }
                : { background: `linear-gradient(165deg, ${mix(book.settings.accent, [255, 255, 255], 0.14)}, ${book.settings.accent})` }
            }
          >
            {!book.cover && <span>{book.title || 'Untitled'}</span>}
          </div>
          <div className="cover-controls">
            <div className="row-label">Cover</div>
            <div className="row-sub">Shown on your library shelf. A clean image, ideally portrait.</div>
            <div className="cover-buttons">
              <button className="btn" onClick={() => coverRef.current?.click()}>
                {book.cover ? 'Replace cover' : 'Upload cover'}
              </button>
              {book.cover && (
                <button className="btn ghost" onClick={() => setBookCover(book.id, undefined)}>
                  Remove
                </button>
              )}
            </div>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCoverFile} />
          </div>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Book title</span>
            <input value={book.title} onChange={(e) => updateBook({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Author</span>
            <input value={book.author} onChange={(e) => updateBook({ author: e.target.value })} />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              className="select"
              value={book.status}
              onChange={(e) => setBookStatus(book.id, e.target.value as BookStatus)}
              style={{ color: (BOOK_STATUS_META[book.status] ?? BOOK_STATUS_META.writing).color }}
            >
              {BOOK_STATUS_ORDER.map((s) => (
                <option key={s} value={s} style={{ color: '#2b2520' }}>
                  {BOOK_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field wide">
            <span>Subtitle / theme</span>
            <input value={book.theme} onChange={(e) => updateBook({ theme: e.target.value })} />
          </label>
        </div>
      </section>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">Appearance</h2>
        <div className="row between">
          <div>
            <div className="row-label">Theme</div>
            <div className="row-sub">Light, or a warm candle-lit dark.</div>
          </div>
          <div className="seg">
            <button className={settings.theme === 'light' ? 'on' : ''} onClick={() => updateSettings({ theme: 'light' })}>
              ☀ Light
            </button>
            <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => updateSettings({ theme: 'dark' })}>
              ☾ Dark
            </button>
          </div>
        </div>
        <div className="row between">
          <div>
            <div className="row-label">Accent colour</div>
            <div className="row-sub">Drives headings, chips, and highlights.</div>
          </div>
          <div className="swatches">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={`swatch${settings.accent.toLowerCase() === c.toLowerCase() ? ' on' : ''}`}
                style={{ background: c }}
                onClick={() => updateSettings({ accent: c })}
                title={c}
              />
            ))}
            <label className="swatch custom" title="Custom colour">
              <input type="color" value={settings.accent} onChange={(e) => updateSettings({ accent: e.target.value })} />
              +
            </label>
          </div>
        </div>
        <div className="row between">
          <div>
            <div className="row-label">Reading font</div>
            <div className="row-sub">Body type for reader & editor.</div>
          </div>
          <select className="select" value={settings.readingFont} onChange={(e) => updateSettings({ readingFont: e.target.value })} style={{ fontFamily: settings.readingFont }}>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <p className="font-preview" style={{ fontFamily: settings.readingFont }}>
          Community building is slow — like slow cooking. It compounds over time.
        </p>
      </section>

      {/* ── Chapter structures ─────────────────────────────────────────── */}
      <section className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Chapter structures
          </h2>
          <button className="btn primary" onClick={() => addTemplate()}>
            + Add structure
          </button>
        </div>
        <p className="row-sub" style={{ marginBottom: 12 }}>
          Reusable templates of sections. Apply one to a chapter (or none) from the chapter editor.
        </p>
        <div className="templates">
          {templates.map((t) => (
            <div className="template" key={t.id}>
              <div className="template-head">
                <input className="template-name" value={t.name} onChange={(e) => updateTemplateName(t.id, e.target.value)} placeholder="Structure name…" />
                <button className="ref-del" title="Delete structure" onClick={() => { if (confirm(`Delete the structure “${t.name}”?`)) removeTemplate(t.id) }}>
                  ✕
                </button>
              </div>
              <div className="parts">
                {t.parts.map((part, i) => (
                  <div className="part-row" key={part.id}>
                    <span className="part-num">{i + 1}</span>
                    <input className="part-label" value={part.label} placeholder="Section label…" onChange={(e) => updateTemplatePart(t.id, part.id, { label: e.target.value })} />
                    <input className="part-placeholder" value={part.placeholder} placeholder="Grayed hint for the title…" onChange={(e) => updateTemplatePart(t.id, part.id, { placeholder: e.target.value })} />
                    <button className="part-del" title="Remove part" onClick={() => removeTemplatePart(t.id, part.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn ghost add-part" onClick={() => addTemplatePart(t.id)}>
                + Add part
              </button>
            </div>
          ))}
          {templates.length === 0 && <p className="empty">No structures yet. Add one, or write chapters freeform.</p>}
        </div>
      </section>

      {/* ── Tone of voice ──────────────────────────────────────────────── */}
      <section className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Tone of voice
          </h2>
          <button className="btn ghost" onClick={() => updateSettings({ toneOfVoice: DEFAULT_VOICE })}>
            Reset to default voice
          </button>
        </div>
        <p className="row-sub" style={{ marginBottom: 10 }}>
          Governs all AI-assisted drafting. The integrity guardrails are pre-filled — edit freely.
        </p>
        <textarea className="voice" value={settings.toneOfVoice} onChange={(e) => updateSettings({ toneOfVoice: e.target.value })} rows={12} />
      </section>

      {/* ── Writing tools ──────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">Writing tools</h2>
        <div className="row between">
          <div>
            <div className="row-label">Grammarly in the editor</div>
            <div className="row-sub">
              Lets your Grammarly Pro <em>browser extension</em> underline suggestions inside the
              editor. Reload the editor after toggling.
            </div>
          </div>
          <Toggle on={settings.grammarlyEnabled} onChange={(v) => updateSettings({ grammarlyEnabled: v })} />
        </div>
        <p className="note">
          Note: Grammarly retired its embeddable SDK in 2024, so the check runs via your installed
          browser extension (signed in to your Pro account), not a built-in API.
        </p>
      </section>

      {/* ── BIG TRIBE BRAIN ────────────────────────────────────────────── */}
      <section className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            BIG TRIBE BRAIN
          </h2>
          <span className={`conn ${settings.brain.connected ? 'ok' : 'off'}`}>
            <span className="dot" />
            {settings.brain.connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Brain name</span>
            <input value={settings.brain.name} onChange={(e) => updateSettings({ brain: { ...settings.brain, name: e.target.value } })} />
          </label>
          <label className="field">
            <span>Brain service URL</span>
            <input placeholder="http://localhost:5274" value={settings.brain.endpoint} onChange={(e) => updateSettings({ brain: { ...settings.brain, endpoint: e.target.value } })} />
          </label>
        </div>

        <div className="brain-test">
          <button className="btn" onClick={testBrain} disabled={brainStatus.testing}>
            {brainStatus.testing ? 'Testing…' : 'Test connection'}
          </button>
          {brainStatus.message && <span className="brain-msg ok">{brainStatus.message}</span>}
          {brainStatus.error && <span className="brain-msg err">{brainStatus.error}</span>}
        </div>

        <div className="brain-search">
          <div className="brain-search-row">
            <input
              placeholder="Try a search — e.g. “how belonging is built”"
              value={brainQuery}
              onChange={(e) => setBrainQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBrain()}
            />
            <button className="btn primary" onClick={searchBrain} disabled={brainSearching}>
              {brainSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {brainResults && brainResults.length === 0 && <p className="empty">No matching passages.</p>}
          {brainResults && brainResults.length > 0 && (
            <div className="brain-results">
              <div className="brain-results-head">
                Verbatim passages from your brain — source-first, nothing drafted.
              </div>
              {brainResults.map((c, i) => (
                <div className="brain-chunk" key={c.id ?? i}>
                  {c.name && <div className="bc-name">{c.name}</div>}
                  <div className="bc-text">“{c.text}”</div>
                  <div className="bc-meta">
                    <span className="bc-source">{c.source}</span>
                    {typeof c.mentionCount === 'number' && <span className="bc-pill">{c.mentionCount}×</span>}
                    {typeof c.distance === 'number' && <span className="bc-pill">cos {c.distance.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="note">
          Read-only for now — the brain returns verbatim source chunks with provenance for your
          approval before any prose is drafted. Write-back stays off until the schema is confirmed.
        </p>
      </section>

      {/* ── References ─────────────────────────────────────────────────── */}
      <section className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Reference library
          </h2>
          <button className="btn primary" onClick={() => addReference()}>
            + Add book
          </button>
        </div>
        <p className="row-sub" style={{ marginBottom: 12 }}>
          Books and authors you cite — and quote from. Only approved sources should be cited.
        </p>
        <div className="refs">
          {references.map((r) => {
            const cited = r.citingChapters
              .map((id) => chapters.find((c) => c.id === id)?.number)
              .filter(Boolean)
              .sort((a, b) => (a as number) - (b as number))
            return (
              <div className="ref" key={r.id}>
                <div className="ref-grid">
                  <input className="ref-author" placeholder="Author" value={r.author} onChange={(e) => updateReference(r.id, { author: e.target.value })} />
                  <input className="ref-work" placeholder="Work / book" value={r.work} onChange={(e) => updateReference(r.id, { work: e.target.value })} />
                  <button className="ref-del" title="Remove" onClick={() => removeReference(r.id)}>
                    ✕
                  </button>
                </div>
                <input className="ref-idea" placeholder="The idea you're citing…" value={r.idea} onChange={(e) => updateReference(r.id, { idea: e.target.value })} />
                <input className="ref-phrasing" placeholder='Approved phrasing, e.g. "Seth Godin explains it brilliantly in Tribes when he says…"' value={r.phrasing} onChange={(e) => updateReference(r.id, { phrasing: e.target.value })} />
                <div className="ref-cited">
                  {cited.length ? `Cited in chapter${cited.length > 1 ? 's' : ''} ${cited.join(', ')}` : 'Not yet cited'}
                </div>
              </div>
            )
          })}
          {references.length === 0 && <p className="empty">No references yet. Add the books you'll cite.</p>}
        </div>
      </section>

      {/* ── Danger ─────────────────────────────────────────────────────── */}
      <section className="card danger">
        <div className="row between">
          <div>
            <div className="row-label">Delete this book</div>
            <div className="row-sub">
              {bookCount <= 1
                ? 'Your last book can’t be deleted.'
                : `Remove “${book.title || 'Untitled Book'}” and everything in it.`}
            </div>
          </div>
          <button
            className="btn"
            disabled={bookCount <= 1}
            onClick={() => {
              if (confirm(`Delete the book “${book.title || 'Untitled Book'}” and everything in it?`)) {
                removeBook(book.id)
                navigate('/')
              }
            }}
          >
            Delete book
          </button>
        </div>
        <div className="row between">
          <div>
            <div className="row-label">Reset studio</div>
            <div className="row-sub">Wipe all books and local edits, reload the seed.</div>
          </div>
          <button className="btn" onClick={() => { if (confirm('Reset the whole studio to the seed? This erases all books and edits.')) resetToSeed() }}>
            Reset to seed
          </button>
        </div>
      </section>
    </main>
  )
}
