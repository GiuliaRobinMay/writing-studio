import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { chaptersSorted, currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import { countWords } from '../lib/text'
import type { Section } from '../types'
import { StatusSelect } from '../components/StatusChip'
import { SectionEditor } from '../components/SectionEditor'
import { ChapterMenu } from '../components/ChapterSub'

/** A draggable section, with the grip wired to dnd-kit. */
function SortableSection({ section, canDelete }: { section: Section; canDelete: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const handle = (
    <button className="sec-grip" {...attributes} {...listeners} title="Drag to reorder">
      ⠿
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        position: 'relative',
        zIndex: isDragging ? 5 : undefined,
      }}
    >
      <SectionEditor section={section} dragHandle={handle} canDelete={canDelete} />
    </div>
  )
}

/** The hover "+" between blocks — opens a menu to add a section, separator, or image. */
function InsertDivider({ chapterId, index }: { chapterId: string; index: number }) {
  const insertSection = useBookStore((s) => s.insertSection)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const add = (kind: 'section' | 'separator' | 'image') => {
    insertSection(chapterId, index, kind)
    setOpen(false)
  }
  return (
    <div className={`sec-divider${open ? ' open' : ''}`} ref={ref}>
      <span className="sec-divider-line" />
      <button className="sec-divider-add" title="Add here" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <div className="sec-add-menu">
          <button onClick={() => add('section')}>＋ New section</button>
          <button onClick={() => add('separator')}>― Separator</button>
          <button onClick={() => add('image')}>▦ Image</button>
        </div>
      )}
    </div>
  )
}

export function Editor() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const sections = useBookStore((s) => currentBook(s).sections)
  const setChapterStatus = useBookStore((s) => s.setChapterStatus)
  const updateChapterMeta = useBookStore((s) => s.updateChapterMeta)
  const addSection = useBookStore((s) => s.addSection)
  const reorderSections = useBookStore((s) => s.reorderSections)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const ordered = useMemo(() => chaptersSorted(chapters), [chapters])
  const chapter = chapters.find((c) => c.id === chapterId)
  const chSections = useMemo(
    () => (chapter ? sectionsOf(sections, chapter.id) : []),
    [sections, chapter],
  )
  const idx = ordered.findIndex((c) => c.id === chapterId)
  const prev = idx > 0 ? ordered[idx - 1] : undefined
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined
  const chapterWords = chSections.reduce((sum, s) => sum + countWords(s.body), 0)

  function onSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = chSections.map((s) => s.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    ids.splice(to, 0, ids.splice(from, 1)[0])
    reorderSections(chapter!.id, ids)
  }

  useEffect(() => {
    const hash = window.location.hash.split('#')[2]
    if (hash) {
      const el = document.getElementById(hash)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    }
  }, [chapterId])

  if (!chapter) {
    return (
      <main className="page">
        <p className="empty">Chapter not found.</p>
        <Link className="btn" to="/overview">
          ← Back to overview
        </Link>
      </main>
    )
  }

  return (
    <main className="page editor">
      <div className="editor-main">
        <div className="editor-chapter-head">
          <div className="ech-top">
            <span className="ech-num">Chapter {String(chapter.number).padStart(2, '0')}</span>
            <div className="ech-actions">
              <Link className="btn" to={`/read/${chapter.id}`}>
                Read ↗
              </Link>
              <ChapterMenu chapterId={chapter.id} />
            </div>
          </div>
          <input
            className="ech-title"
            value={chapter.title}
            placeholder="Chapter title…"
            onChange={(e) => updateChapterMeta(chapter.id, { title: e.target.value })}
          />
          <input
            className="ech-tagline"
            value={chapter.tagline}
            placeholder="Tagline / subtitle (optional)…"
            onChange={(e) => updateChapterMeta(chapter.id, { tagline: e.target.value })}
          />
          <div className="ech-meta">
            <span className="ech-wc">{chapterWords.toLocaleString()} words</span>
            <StatusSelect status={chapter.status} onChange={(s) => setChapterStatus(chapter.id, s)} stop={false} />
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
          <SortableContext items={chSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {chSections.map((s, i) => (
              <Fragment key={s.id}>
                <InsertDivider chapterId={chapter.id} index={i} />
                <SortableSection section={s} canDelete={chSections.length > 1} />
              </Fragment>
            ))}
          </SortableContext>
        </DndContext>

        <button className="add-section" onClick={() => addSection(chapter.id)}>
          <span className="plus">+</span> Add a section
        </button>

        <div className="editor-foot">
          {prev ? (
            <button className="btn ghost" onClick={() => navigate(`/chapter/${prev.id}`)}>
              ← {prev.title || 'Untitled'}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button className="btn ghost" onClick={() => navigate(`/chapter/${next.id}`)}>
              {next.title || 'Untitled'} →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
