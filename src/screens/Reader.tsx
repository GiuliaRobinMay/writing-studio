import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { chaptersSorted, currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import type { Chapter, Section } from '../types'
import { type Block, htmlToBlocks, packPages } from '../lib/paginate'
import { isHtmlEmpty } from '../lib/text'
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
    </main>
  )
}
