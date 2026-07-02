import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chapter, Section } from '../types'
import { chaptersSorted, sectionsOf } from '../store/useBookStore'
import { SpeechReader, speechSupported, toChunks, type SpeechState } from '../lib/speech'

/** Strip HTML to plain text for speaking. */
function strip(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Build the ordered list of things to read from the current reader view. */
function buildParagraphs(chapters: Chapter[], sections: Section[], onlyChapterId?: string): string[] {
  const chs = chaptersSorted(chapters).filter((c) => !onlyChapterId || c.id === onlyChapterId)
  const out: string[] = []
  for (const ch of chs) {
    out.push(`Chapter ${ch.number}. ${ch.title || 'Untitled chapter'}.`)
    if (ch.tagline) out.push(ch.tagline)
    for (const s of sectionsOf(sections, ch.id)) {
      if (s.kind === 'separator' || s.kind === 'image') continue
      if (s.title.trim()) out.push(s.title)
      const text = strip(s.body)
      if (text) out.push(text)
    }
  }
  return out
}

const RATES = [0.8, 1, 1.15, 1.3]

export function ReaderListen({
  chapters,
  sections,
  onlyChapterId,
}: {
  chapters: Chapter[]
  sections: Section[]
  onlyChapterId?: string
}) {
  const readerRef = useRef<SpeechReader>()
  const [state, setState] = useState<SpeechState>('idle')
  const [rate, setRate] = useState(1)

  if (!readerRef.current) readerRef.current = new SpeechReader()

  useEffect(() => {
    const r = readerRef.current!
    r.onState = setState
    return () => r.stop()
  }, [])

  // Stop reading if the view changes (different chapter / whole book).
  useEffect(() => {
    readerRef.current?.stop()
  }, [onlyChapterId])

  const chunks = useMemo(
    () => toChunks(buildParagraphs(chapters, sections, onlyChapterId)),
    [chapters, sections, onlyChapterId],
  )

  if (!speechSupported()) return null

  const start = () => readerRef.current?.play(chunks, rate)

  return (
    <div className="reader-listen">
      {state === 'idle' && (
        <button className="rl-btn" onClick={start} disabled={!chunks.length} title="Read aloud">
          ▶ Listen
        </button>
      )}
      {state === 'playing' && (
        <button className="rl-btn on" onClick={() => readerRef.current?.pause()} title="Pause">
          ❚❚ Pause
        </button>
      )}
      {state === 'paused' && (
        <button className="rl-btn on" onClick={() => readerRef.current?.resume()} title="Resume">
          ▶ Resume
        </button>
      )}
      {state !== 'idle' && (
        <>
          <button className="rl-stop" onClick={() => readerRef.current?.stop()} title="Stop">
            ✕
          </button>
          <select
            className="rl-rate"
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value)
              setRate(r)
              readerRef.current?.play(chunks, r) // restart at the new speed
            }}
            title="Reading speed"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
