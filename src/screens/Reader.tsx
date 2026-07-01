import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { chaptersSorted, currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import type { Chapter, Section } from '../types'
import { type Block, htmlToBlocks, packPages } from '../lib/paginate'
import { isHtmlEmpty } from '../lib/text'
import { bookToDocxBlob, downloadBlob } from '../lib/exportDocx'
import { ReaderNotes } from '../components/ReaderNotes'

// Must mirror reader.css page geometry so packing matches rendering.
const CONTENT_H = 1046 - 84 - 72 // page height − top pad − bottom pad

interface RBlock {
  block: Block
  keepWithNext: boolean
  breakBefore: boolean
  head: string
  dropCap?: boolean
  empty?: boolean
  /** For html body blocks — which section and which body-block index. */
  sectionId?: string
  bodyIndex?: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function buildBlocks(chapters: Chapter[], sections: Section[], onlyChapter?: string): RBlock[] {
  const out: RBlock[] = []
  const chs = onlyChapter ? chapters.filter((c) => c.id === onlyChapter) : chapters

  for (const ch of chs) {
    out.push({
      block: {
        kind: 'chapter-title',
        chapterId: ch.id,
        number: ch.number,
        title: ch.title || 'Untitled chapter',
        tagline: ch.tagline,
      },
      keepWithNext: true,
      breakBefore: true,
      head: ch.title || `Chapter ${ch.number}`,
    })

    const content = sectionsOf(sections, ch.id).filter((s) => !isHtmlEmpty(s.body))
    if (content.length === 0) {
      out.push({
        block: { kind: 'html', html: 'This chapter is still being written.' },
        keepWithNext: false,
        breakBefore: false,
        head: ch.title,
        empty: true,
      })
      continue
    }

    let firstBodyPending = true
    for (const sec of content) {
      if (sec.title.trim()) {
        out.push({
          block: { kind: 'section-title', title: sec.title },
          keepWithNext: true,
          breakBefore: false,
          head: ch.title,
        })
      }
      htmlToBlocks(sec.body).forEach((b, bi) => {
        const isPara = b.kind === 'html' && b.html.startsWith('<p')
        const dropCap = firstBodyPending && isPara
        if (dropCap) firstBodyPending = false
        out.push({ block: b, keepWithNext: false, breakBefore: false, head: ch.title, dropCap, sectionId: sec.id, bodyIndex: bi })
      })
    }
  }
  return out
}

function RenderBlock({ rb }: { rb?: RBlock }) {
  if (!rb) return null
  const b = rb.block
  if (b.kind === 'chapter-title') {
    return (
      <div className="rblock chapter-title">
        <div className="ct-num">Chapter {pad2(b.number)}</div>
        <div className="ct-name">{b.title}</div>
        <div className="ct-tag">{b.tagline}</div>
        <div className="ct-rule" />
      </div>
    )
  }
  if (b.kind === 'section-title') {
    return <div className="rblock section-title">{b.title}</div>
  }
  return (
    <div
      className={`rblock${rb.dropCap ? ' dropcap' : ''}${rb.empty ? ' reader-empty' : ''}`}
      data-section={rb.sectionId}
      data-bodyindex={rb.bodyIndex}
      dangerouslySetInnerHTML={{ __html: b.html }}
    />
  )
}

function measure(el: HTMLElement): number {
  const cs = getComputedStyle(el)
  return el.getBoundingClientRect().height + parseFloat(cs.marginTop || '0') + parseFloat(cs.marginBottom || '0')
}

interface PageView {
  number: number
  head: string
  /** Resolved blocks (not indices) so a page never references a stale array. */
  blocks: RBlock[]
}

export function Reader() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const sections = useBookStore((s) => currentBook(s).sections)

  const ordered = useMemo(() => chaptersSorted(chapters), [chapters])
  const single = chapterId ? chapters.find((c) => c.id === chapterId) : undefined
  const rblocks = useMemo(
    () => buildBlocks(ordered, sections, chapterId),
    [ordered, sections, chapterId],
  )

  const hostRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PageView[]>([])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const children = Array.from(host.children) as HTMLElement[]
    const heights = children.map(measure)
    const packed = packPages({
      heights,
      keepWithNext: rblocks.map((r) => r.keepWithNext),
      breakBefore: rblocks.map((r) => r.breakBefore),
      pageHeight: CONTENT_H,
    })
    let n = 0
    setPages(
      packed.map((indices) => ({
        number: ++n,
        head: rblocks[indices[0]]?.head ?? '',
        blocks: indices.map((i) => rblocks[i]).filter(Boolean),
      })),
    )
  }, [rblocks])

  const idx = single ? ordered.findIndex((c) => c.id === single.id) : -1
  const prev = idx > 0 ? ordered[idx - 1] : undefined
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined

  // ── Export (Word / print-to-PDF) ──
  const notes = useBookStore((s) => currentBook(s).notes)
  const [exporting, setExporting] = useState(false)
  const [expOpen, setExpOpen] = useState(false)
  const expRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expOpen) return
    const onDoc = (e: MouseEvent) => {
      if (expRef.current && !expRef.current.contains(e.target as Node)) setExpOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [expOpen])

  async function exportWord() {
    setExpOpen(false)
    setExporting(true)
    try {
      const blob = await bookToDocxBlob(book, chapters, sections, notes, single?.id)
      const name = (single ? single.title || 'chapter' : book.title || 'book').replace(/[^\w-]+/g, '_')
      downloadBlob(blob, `${name}.docx`)
    } finally {
      setExporting(false)
    }
  }

  // ── Comments (gathered margin notes for review) ──
  const [commentsOpen, setCommentsOpen] = useState(false)
  const viewNotes = useMemo(() => {
    const ids = new Set(sections.filter((s) => !single || s.chapterId === single.id).map((s) => s.id))
    return notes.filter((n) => ids.has(n.sectionId))
  }, [notes, sections, single])
  function jumpToNote(id: string) {
    const el = document.querySelector(`.note-hl[data-note-id="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('note-flash')
      setTimeout(() => el.classList.remove('note-flash'), 1200)
    }
  }

  return (
    <main className="page reader">
      <div className="reader-bar">
        <Link className="btn ghost" to={single ? `/chapter/${single.id}` : '/overview'}>
          ← {single ? 'Edit' : 'Overview'}
        </Link>
        <span className="rb-title">{single ? single.title || 'Untitled chapter' : book.title}</span>
        <select
          value={single ? single.id : 'all'}
          onChange={(e) => navigate(e.target.value === 'all' ? '/read' : `/read/${e.target.value}`)}
        >
          <option value="all">Whole book</option>
          {ordered.map((c) => (
            <option key={c.id} value={c.id}>
              {pad2(c.number)} · {c.title || 'Untitled chapter'}
            </option>
          ))}
        </select>
        <span className="rb-count">
          {pages.length} {pages.length === 1 ? 'page' : 'pages'}
        </span>
        <div className="rb-export" ref={expRef}>
          <button className="rb-export-btn" onClick={() => setExpOpen((o) => !o)} disabled={exporting}>
            {exporting ? 'Preparing…' : '⤓ Export'}
          </button>
          {expOpen && (
            <div className="more-pop rb-export-pop">
              <button onClick={exportWord}>Word (.docx){single ? ' — this chapter' : ''}</button>
              <button onClick={() => { setExpOpen(false); window.print() }}>Print / Save as PDF</button>
            </div>
          )}
        </div>
      </div>

      <div className="pages">
        {pages.map((pv) => (
          <div className="page-sheet" key={pv.number}>
            <div className="running-head">
              <span>{book.title}</span>
              <span>{pv.head}</span>
            </div>
            <div className="page-content">
              {pv.blocks.map((rb, i) => (
                <RenderBlock key={i} rb={rb} />
              ))}
            </div>
            <div className="page-number">{pv.number}</div>
          </div>
        ))}
      </div>

      {single && (
        <div className="reader-foot">
          {prev ? (
            <button className="btn ghost" onClick={() => navigate(`/read/${prev.id}`)}>
              ← {prev.title}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button className="btn ghost" onClick={() => navigate(`/read/${next.id}`)}>
              {next.title} →
            </button>
          )}
        </div>
      )}

      {/* Offscreen measuring host — same width & type as a real page. */}
      <div className="measure-host" ref={hostRef} aria-hidden>
        {rblocks.map((rb, i) => (
          <RenderBlock key={i} rb={rb} />
        ))}
      </div>

      <ReaderNotes />

      <button className={`comments-fab${commentsOpen ? ' on' : ''}`} onClick={() => setCommentsOpen((o) => !o)} title="Comments">
        💬 <span>{viewNotes.length}</span>
      </button>
      {commentsOpen && (
        <aside className="comments-panel">
          <div className="comments-head">
            <span>Comments · {viewNotes.length}</span>
            <button onClick={() => setCommentsOpen(false)} title="Close">✕</button>
          </div>
          {viewNotes.length === 0 ? (
            <p className="empty" style={{ padding: '0 4px' }}>No comments yet. Select text in the book to add one.</p>
          ) : (
            <div className="comments-list">
              {viewNotes.map((n) => (
                <button className="comment-item" key={n.id} onClick={() => jumpToNote(n.id)}>
                  {n.quote && <div className="comment-quote">“{n.quote}”</div>}
                  <div className="comment-text">{n.text || '(empty note)'}</div>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}
    </main>
  )
}
