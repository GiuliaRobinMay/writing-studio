import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { currentBook, useBookStore } from '../store/useBookStore'

/** The per-chapter "⋮" menu — Brief · Resources · Settings. Keeps the writing
 *  surface minimal by moving everything else off it. */
export function ChapterMenu({ chapterId }: { chapterId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const path = useLocation().pathname
  const active = /\/(brief|resources|settings)$/.test(path)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="more-menu" ref={ref}>
      <button className={`more-btn${open || active ? ' on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Chapter menu" title="Chapter">
        ⋮
      </button>
      {open && (
        <div className="more-pop">
          <NavLink to={`/chapter/${chapterId}/brief`} onClick={() => setOpen(false)}>
            Brief
          </NavLink>
          <NavLink to={`/chapter/${chapterId}/resources`} onClick={() => setOpen(false)}>
            Resources
          </NavLink>
          <NavLink to={`/chapter/${chapterId}/settings`} onClick={() => setOpen(false)}>
            Settings
          </NavLink>
        </div>
      )}
    </div>
  )
}

/** Shared layout for the chapter sub-pages (Brief / Resources / Settings). */
export function ChapterSubLayout({ chapterId, title, children }: { chapterId: string; title: string; children: ReactNode }) {
  const chapter = useBookStore((s) => currentBook(s).chapters.find((c) => c.id === chapterId))
  if (!chapter) {
    return (
      <main className="page">
        <p className="empty">Chapter not found.</p>
        <Link className="btn" to="/overview">
          ← Overview
        </Link>
      </main>
    )
  }
  return (
    <main className="page chsub">
      <div className="chsub-bar">
        <Link className="btn ghost" to={`/chapter/${chapterId}`}>
          ← Back to writing
        </Link>
        <ChapterMenu chapterId={chapterId} />
      </div>
      <div className="page-head">
        <div className="chsub-ctx">
          Chapter {String(chapter.number).padStart(2, '0')} · {chapter.title || 'Untitled'}
        </div>
        <h1>{title}</h1>
      </div>
      {children}
    </main>
  )
}
