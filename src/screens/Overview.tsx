import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { chaptersSorted, currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import type { Chapter, Section } from '../types'
import { STATUS_META } from '../lib/status'
import { countWords, estimatePages } from '../lib/text'
import { StatusChip, StatusSelect } from '../components/StatusChip'

export function Overview() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const sections = useBookStore((s) => currentBook(s).sections)
  const reorderChapters = useBookStore((s) => s.reorderChapters)
  const addChapter = useBookStore((s) => s.addChapter)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function handleAddChapter() {
    const id = addChapter()
    navigate(`/chapter/${id}`)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const ordered = useMemo(() => chaptersSorted(chapters), [chapters])

  // Aggregate stats across the whole book.
  const stats = useMemo(() => {
    const wordsByChapter = new Map<string, number>()
    let totalWords = 0
    let weightSum = 0
    for (const ch of chapters) {
      const secs = sectionsOf(sections, ch.id)
      let w = 0
      for (const sec of secs) {
        w += countWords(sec.body)
        weightSum += STATUS_META[sec.status].weight
      }
      wordsByChapter.set(ch.id, w)
      totalWords += w
    }
    const finished = chapters.filter((c) => c.status === 'finished').length
    const drafted = sections.length ? Math.round((weightSum / sections.length) * 100) : 0
    return { wordsByChapter, totalWords, finished, drafted, totalPages: estimatePages(totalWords) }
  }, [chapters, sections])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = ordered.map((c) => c.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    ids.splice(to, 0, ids.splice(from, 1)[0])
    reorderChapters(ids)
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <main className="page">
      <div className="page-head">
        <h1>{book.title}</h1>
        <div className="theme">{book.theme}</div>
      </div>

      <section className="summary">
        <div className="stat">
          <div className="num">
            {stats.finished}/{ordered.length}
          </div>
          <div className="lbl">Chapters finished</div>
        </div>
        <div className="stat">
          <div className="num">{stats.totalWords.toLocaleString()}</div>
          <div className="lbl">Words drafted</div>
        </div>
        <div className="stat">
          <div className="num">~{stats.totalPages}</div>
          <div className="lbl">Est. pages</div>
        </div>
        <div className="progress-track">
          <div className="bar">
            <span style={{ width: `${stats.drafted}%` }} />
          </div>
          <div className="cap">
            {stats.finished} of {ordered.length} chapters finished · {stats.drafted}% drafted
          </div>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="ch-list">
            {ordered.map((ch) => (
              <ChapterCard
                key={ch.id}
                chapter={ch}
                sections={sectionsOf(sections, ch.id)}
                words={stats.wordsByChapter.get(ch.id) ?? 0}
                expanded={expanded.has(ch.id)}
                onToggle={() => toggle(ch.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button className="add-chapter" onClick={handleAddChapter}>
        <span className="plus">+</span> Add a chapter
      </button>
    </main>
  )
}

function ChapterCard({
  chapter,
  sections,
  words,
  expanded,
  onToggle,
}: {
  chapter: Chapter
  sections: Section[]
  words: number
  expanded: boolean
  onToggle: () => void
}) {
  const navigate = useNavigate()
  const setChapterStatus = useBookStore((s) => s.setChapterStatus)
  const setChapterNumber = useBookStore((s) => s.setChapterNumber)
  const removeChapter = useBookStore((s) => s.removeChapter)
  const [numDraft, setNumDraft] = useState(String(chapter.number))
  useEffect(() => setNumDraft(String(chapter.number)), [chapter.number])

  function commitNumber() {
    const n = parseInt(numDraft, 10)
    if (!Number.isNaN(n) && n !== chapter.number) setChapterNumber(chapter.id, n)
    else setNumDraft(String(chapter.number))
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  })

  return (
    <div
      ref={setNodeRef}
      className="ch-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 5 : undefined,
      }}
    >
      <div className="ch-row">
        <span className="ch-grip" {...attributes} {...listeners} title="Drag to reorder">
          ⠿
        </span>
        <input
          className="ch-num-input"
          type="number"
          min={1}
          value={numDraft}
          title="Chapter number — type to reposition"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setNumDraft(e.target.value)}
          onBlur={commitNumber}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        <div className="ch-main" onClick={() => navigate(`/chapter/${chapter.id}`)}>
          <p className={`ch-title${chapter.title ? '' : ' placeholder'}`}>
            {chapter.title || 'Untitled chapter'}
          </p>
          {chapter.tagline && <div className="ch-tag">{chapter.tagline}</div>}
        </div>
        <div className="ch-meta">
          <div className="mini">
            <b>{words.toLocaleString()}</b> words
            <br />~{estimatePages(words)} pages
          </div>
          <StatusSelect status={chapter.status} onChange={(s) => setChapterStatus(chapter.id, s)} />
          <button className="ch-expand" onClick={onToggle} title="Show sections">
            {expanded ? '▾' : '▸'} {sections.length}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="sec-list">
          {sections.map((sec) => (
            <div className="sec-row" key={sec.id}>
              <span className="sec-grip">⠿</span>
              <span className="sec-part">{sec.label || 'Section'}</span>
              <span
                className={`sec-title${sec.title ? '' : ' placeholder'}`}
                onClick={() => navigate(`/chapter/${chapter.id}#${sec.id}`)}
              >
                {sec.title || sec.placeholder || 'Untitled'}
              </span>
              <span className="sec-wc">{countWords(sec.body).toLocaleString()} w</span>
              <StatusChip status={sec.status} />
            </div>
          ))}
          <div className="sec-actions">
            <button className="btn ghost" onClick={() => navigate(`/chapter/${chapter.id}`)}>
              Open editor →
            </button>
            <button
              className="btn ghost danger-link"
              onClick={() => {
                if (confirm(`Delete “${chapter.title}” and its sections? This can't be undone.`))
                  removeChapter(chapter.id)
              }}
            >
              Delete chapter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
