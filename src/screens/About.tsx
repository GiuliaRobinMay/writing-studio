import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentBook, useBookStore } from '../store/useBookStore'
import { SURVEY, SURVEY_IDS, type SurveyQuestion } from '../data/survey'
import type { Resource, ResourceKind } from '../types'

// Each field keeps local state and commits on blur, so typing doesn't re-render
// the whole page.
function SurveyField({ q, value, onCommit }: { q: SurveyQuestion; value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  const props = {
    value: v,
    placeholder: q.placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: () => v !== value && onCommit(v),
  }
  return (
    <label className="survey-field">
      <span className="sf-label">{q.label}</span>
      {q.long ? <textarea rows={2} {...props} /> : <input {...props} />}
    </label>
  )
}

const KIND_LABEL: Record<ResourceKind, string> = {
  paste: 'Pasted', upload: 'Upload', gdrive: 'Drive', gdocs: 'Docs', notion: 'Notion', apple: 'Notes', other: 'Other',
}

const CONNECTORS = [
  { id: 'upload', icon: '⬆', name: 'Upload / Paste', desc: 'Text, notes, transcripts, past drafts', status: 'ready' as const },
  { id: 'gdrive', icon: '📁', name: 'Google Drive', desc: 'Docs & files from your Drive', status: 'setup' as const },
  { id: 'notion', icon: '◼', name: 'Notion', desc: 'Pages & databases from your workspace', status: 'setup' as const },
  { id: 'apple', icon: '🗒', name: 'Apple Notes', desc: 'Notes from your Mac & iPhone', status: 'setup' as const },
  { id: 'brain', icon: '✦', name: 'BIG TRIBE BRAIN', desc: 'Your BigQuery knowledge base', status: 'brain' as const },
]

export function About() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const about = useBookStore((s) => currentBook(s).about)
  const resources = useBookStore((s) => currentBook(s).resources)
  const brainConnected = useBookStore((s) => currentBook(s).settings.brain.connected)
  const updateAbout = useBookStore((s) => s.updateAbout)
  const addResource = useBookStore((s) => s.addResource)
  const removeResource = useBookStore((s) => s.removeResource)

  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [openInfo, setOpenInfo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const answered = SURVEY_IDS.filter((id) => (about[id] || '').trim()).length
  const pct = Math.round((answered / SURVEY_IDS.length) * 100)

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      if (f.size > 3_000_000) continue
      const text = await f.text().catch(() => '')
      addResource({ title: f.name, kind: 'upload', text, source: f.name })
    }
    e.target.value = ''
  }

  function addPaste() {
    if (!pasteText.trim()) return
    addResource({ title: pasteTitle.trim() || 'Pasted note', kind: 'paste', text: pasteText, source: 'Pasted' })
    setPasteTitle('')
    setPasteText('')
  }

  function onConnector(c: (typeof CONNECTORS)[number]) {
    if (c.status === 'ready') document.getElementById('add-resource')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else if (c.status === 'brain') navigate('/settings')
    else setOpenInfo(openInfo === c.id ? null : c.id)
  }

  const words = (r: Resource) => r.text.trim().split(/\s+/).filter(Boolean).length

  return (
    <main className="page about">
      <div className="page-head">
        <h1>Foundation</h1>
        <div className="theme">The brief for “{book.title || 'Untitled'}” — the more you fill in, the better the studio (and, later, AI) understands your book.</div>
      </div>

      <div className="about-progress">
        <div className="bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="cap">{answered} of {SURVEY_IDS.length} answered · {pct}%</div>
      </div>

      {/* Survey */}
      {SURVEY.map((group) => (
        <section className="card survey-group" key={group.title}>
          <div className="survey-head">
            <h2 className="card-title">{group.title}</h2>
            <span className="survey-blurb">{group.blurb}</span>
          </div>
          <div className="survey-fields">
            {group.questions.map((q) => (
              <SurveyField key={q.id} q={q} value={about[q.id] || ''} onCommit={(v) => updateAbout(q.id, v)} />
            ))}
          </div>
        </section>
      ))}

      {/* Connectors */}
      <section className="card">
        <h2 className="card-title">Connect your tools</h2>
        <p className="row-sub" style={{ marginBottom: 14 }}>
          Bring in your own material — it grounds everything the studio helps you write. Upload &amp; paste work today; the rest connect with a one-time setup.
        </p>
        <div className="connectors">
          {CONNECTORS.map((c) => (
            <div className="connector" key={c.id}>
              <button className="connector-card" onClick={() => onConnector(c)}>
                <span className="conn-icon">{c.icon}</span>
                <span className="conn-body">
                  <span className="conn-name">{c.name}</span>
                  <span className="conn-desc">{c.desc}</span>
                </span>
                <span className={`conn-pill ${c.status}`}>
                  {c.status === 'ready' ? 'Ready' : c.status === 'brain' ? (brainConnected ? 'Connected' : 'Set up') : 'Connect'}
                </span>
              </button>
              {openInfo === c.id && (
                <div className="conn-info">
                  Connecting {c.name} needs a one-time authorization (OAuth) we’ll set up together. Once linked, your selected pages import here as resources — verbatim, with provenance.
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="card" id="add-resource">
        <h2 className="card-title">Resources</h2>
        <p className="row-sub" style={{ marginBottom: 12 }}>
          Paste or upload text you want the book grounded in — transcripts, notes, past drafts.
        </p>
        <div className="paste-box">
          <input className="paste-title" placeholder="Title (optional)" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} />
          <textarea className="paste-text" rows={3} placeholder="Paste text here…" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <div className="paste-actions">
            <button className="btn" onClick={() => fileRef.current?.click()}>Upload text file</button>
            <button className="btn primary" onClick={addPaste} disabled={!pasteText.trim()}>Add resource</button>
            <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.csv,.json,text/*" multiple hidden onChange={onUpload} />
          </div>
        </div>

        <div className="resource-list">
          {resources.length === 0 && <p className="empty">No resources yet.</p>}
          {resources.map((r) => (
            <div className="resource" key={r.id}>
              <div className="res-main">
                <span className="res-kind">{KIND_LABEL[r.kind]}</span>
                <span className="res-title">{r.title}</span>
                <span className="res-words">{words(r).toLocaleString()} words</span>
                <button className="ref-del" title="Remove" onClick={() => removeResource(r.id)}>✕</button>
              </div>
              {r.text.trim() && <div className="res-snippet">{r.text.slice(0, 180)}{r.text.length > 180 ? '…' : ''}</div>}
              {r.source && <div className="res-source">{r.source}</div>}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
