import { useEffect, useRef, useState } from 'react'
import { currentBook, emptyWorkspace, useBookStore } from '../store/useBookStore'
import type { ChapterImage, ChapterWorkspace as WS } from '../types'
import { resizeImageFile } from '../lib/image'
import { getImage, setImage, delImage } from '../lib/imagestore'

let counter = 0
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter += 1)}`

/** A brief field that commits on blur (so typing doesn't re-render the panel). */
function WField({ label, value, placeholder, onCommit }: { label: string; value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={2} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />
    </label>
  )
}

function ImageThumb({ image, onCaption, onRemove }: { image: ChapterImage; onCaption: (c: string) => void; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getImage(image.id).then((u) => alive && u && setUrl(u))
    return () => {
      alive = false
    }
  }, [image.id])
  return (
    <div className="ws-image">
      <div className="ws-image-frame">
        {url ? <img src={url} alt={image.caption} /> : <div className="ws-image-ph" />}
        <button className="ws-image-del" title="Remove image" onClick={onRemove}>
          ✕
        </button>
      </div>
      <input className="ws-caption" placeholder="Caption…" value={image.caption} onChange={(e) => onCaption(e.target.value)} />
    </div>
  )
}

export function ChapterWorkspace({ chapterId }: { chapterId: string }) {
  const chapter = useBookStore((s) => currentBook(s).chapters.find((c) => c.id === chapterId))
  const update = useBookStore((s) => s.updateChapterWorkspace)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const ws: WS = chapter?.workspace ?? emptyWorkspace()
  const patch = (p: Partial<WS>) => update(chapterId, p)

  function addPaste() {
    if (!pasteText.trim()) return
    patch({ resources: [...ws.resources, { id: nid('res'), title: pasteTitle.trim() || 'Material', kind: 'paste', text: pasteText, source: 'Pasted', createdAt: Date.now() }] })
    setPasteTitle('')
    setPasteText('')
  }
  async function onUploadText(e: React.ChangeEvent<HTMLInputElement>) {
    for (const f of Array.from(e.target.files ?? [])) {
      if (f.size > 3_000_000) continue
      const text = await f.text().catch(() => '')
      patch({ resources: [...ws.resources, { id: nid('res'), title: f.name, kind: 'upload', text, source: f.name, createdAt: Date.now() }] })
    }
    e.target.value = ''
  }
  async function onUploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const added: ChapterImage[] = []
    for (const f of Array.from(e.target.files ?? [])) {
      try {
        const url = await resizeImageFile(f, 1100)
        const id = nid('img')
        await setImage(id, url)
        added.push({ id, caption: '', createdAt: Date.now() })
      } catch {
        /* skip */
      }
    }
    if (added.length) patch({ images: [...ws.images, ...added] })
    e.target.value = ''
  }
  function removeImage(id: string) {
    delImage(id)
    patch({ images: ws.images.filter((im) => im.id !== id) })
  }

  return (
    <div className="ws-panel">
      {/* The brief */}
      <section className="ws-section">
        <h4>The brief — your north star for this chapter</h4>
        <div className="field-grid">
          <WField label="Initial idea" value={ws.idea} placeholder="What sparked this chapter?" onCommit={(v) => patch({ idea: v })} />
          <WField label="Purpose" value={ws.purpose} placeholder="Why does this chapter exist?" onCommit={(v) => patch({ purpose: v })} />
          <WField label="Outcome for the reader" value={ws.outcome} placeholder="Where should the reader land?" onCommit={(v) => patch({ outcome: v })} />
          <WField label="Notes" value={ws.notes} placeholder="Anything else to remember…" onCommit={(v) => patch({ notes: v })} />
        </div>
      </section>

      {/* Materials */}
      <section className="ws-section">
        <h4>Materials — books, papers, transcripts, notes</h4>
        <div className="paste-box">
          <input className="paste-title" placeholder="Title (optional)" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} />
          <textarea className="paste-text" rows={2} placeholder="Paste source text, a passage, an idea…" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <div className="paste-actions">
            <button className="btn" onClick={() => fileRef.current?.click()}>Upload text file</button>
            <button className="btn primary" onClick={addPaste} disabled={!pasteText.trim()}>Add material</button>
            <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.csv,.json,text/*" multiple hidden onChange={onUploadText} />
          </div>
        </div>
        <div className="resource-list">
          {ws.resources.map((r) => (
            <div className="resource" key={r.id}>
              <div className="res-main">
                <span className="res-kind">{r.kind === 'upload' ? 'File' : 'Note'}</span>
                <span className="res-title">{r.title}</span>
                <button className="ref-del" title="Remove" onClick={() => patch({ resources: ws.resources.filter((x) => x.id !== r.id) })}>✕</button>
              </div>
              {r.text.trim() && <div className="res-snippet">{r.text.slice(0, 160)}{r.text.length > 160 ? '…' : ''}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Quotes */}
      <section className="ws-section">
        <div className="ws-section-head">
          <h4>Quotes to use</h4>
          <button className="btn ghost" onClick={() => patch({ quotes: [...ws.quotes, { id: nid('q'), text: '', source: '' }] })}>+ Add quote</button>
        </div>
        <div className="ws-quotes">
          {ws.quotes.map((q) => (
            <div className="ws-quote" key={q.id}>
              <textarea className="ws-quote-text" rows={2} placeholder="The quote…" value={q.text} onChange={(e) => patch({ quotes: ws.quotes.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)) })} />
              <div className="ws-quote-foot">
                <input className="ws-quote-source" placeholder="Source — author, work…" value={q.source} onChange={(e) => patch({ quotes: ws.quotes.map((x) => (x.id === q.id ? { ...x, source: e.target.value } : x)) })} />
                <button className="ref-del" title="Remove" onClick={() => patch({ quotes: ws.quotes.filter((x) => x.id !== q.id) })}>✕</button>
              </div>
            </div>
          ))}
          {ws.quotes.length === 0 && <p className="empty">No quotes yet.</p>}
        </div>
      </section>

      {/* Images */}
      <section className="ws-section">
        <div className="ws-section-head">
          <h4>Images</h4>
          <button className="btn ghost" onClick={() => imgRef.current?.click()}>+ Add images</button>
          <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={onUploadImages} />
        </div>
        <div className="ws-images">
          {ws.images.map((im) => (
            <ImageThumb key={im.id} image={im} onCaption={(c) => patch({ images: ws.images.map((x) => (x.id === im.id ? { ...x, caption: c } : x)) })} onRemove={() => removeImage(im.id)} />
          ))}
          {ws.images.length === 0 && <p className="empty">No images yet.</p>}
        </div>
      </section>
    </div>
  )
}
