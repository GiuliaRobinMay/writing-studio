import { useEffect, useRef, useState } from 'react'
import { currentBook, useBookStore } from '../store/useBookStore'
import { drawShareCard, type ShareFormat } from '../lib/sharecard'

const LABELS = ['From my book', 'A line I’m working on', 'Behind the scenes']
const PRESETS = ['#8B5A3C', '#2F5D50', '#7A3B5E', '#324A6D', '#5B5138']

export function ShareStudio() {
  const book = useBookStore((s) => currentBook(s))
  const [quote, setQuote] = useState(
    'Community building compounds the way slow cooking does — nothing looks like it’s happening, and then everything is.',
  )
  const [label, setLabel] = useState(LABELS[0])
  const [format, setFormat] = useState<ShareFormat>('portrait')
  const [accent, setAccent] = useState(book.settings.accent || '#8B5A3C')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      drawShareCard(canvasRef.current, {
        quote,
        author: book.author || 'You',
        bookTitle: book.title,
        label,
        accent,
        format,
      })
    }
  }, [quote, label, format, accent, book.author, book.title])

  const withBlob = (fn: (b: Blob) => void) => canvasRef.current?.toBlob((b) => b && fn(b), 'image/png')

  const download = () =>
    withBlob((b) => {
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(book.title || 'writing-studio').replace(/[^\w-]+/g, '_')}-card.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    })

  const copy = () =>
    withBlob(async (b) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        setShared('Copy isn’t supported in this browser — use Download instead.')
      }
    })

  const share = () =>
    withBlob(async (b) => {
      const file = new File([b], 'card.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: quote })
        } catch {
          /* user cancelled */
        }
      } else {
        setShared('Direct share works on phones/tablets. On desktop, use Download or Copy.')
      }
    })

  return (
    <main className="page share-studio">
      <header className="share-head">
        <h1>Show your work</h1>
        <p>Turn a line from your book into a card you can post — grow your audience while you write.</p>
      </header>

      <div className="share-layout">
        <div className="share-controls">
          <label className="share-field">
            <span>The line</span>
            <textarea rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Paste or write the line you want to share…" />
          </label>

          <label className="share-field">
            <span>Caption</span>
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              {LABELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>

          <div className="share-field">
            <span>Shape</span>
            <div className="share-seg">
              <button className={format === 'portrait' ? 'on' : ''} onClick={() => setFormat('portrait')}>Portrait</button>
              <button className={format === 'square' ? 'on' : ''} onClick={() => setFormat('square')}>Square</button>
            </div>
          </div>

          <div className="share-field">
            <span>Colour</span>
            <div className="share-swatches">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  className={`share-swatch${accent.toLowerCase() === c.toLowerCase() ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                  aria-label={`Accent ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="share-preview">
          <canvas ref={canvasRef} className={`share-canvas ${format}`} />
        </div>
      </div>

      <div className="share-actions">
        <button className="btn primary" onClick={download}>⤓ Download</button>
        <button className="btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy image'}</button>
        <button className="btn" onClick={share}>Share…</button>
      </div>
      {shared && <p className="share-note">{shared}</p>}
    </main>
  )
}
