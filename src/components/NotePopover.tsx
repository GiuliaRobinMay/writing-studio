import { useEffect, useRef } from 'react'
import type { Note } from '../types'

export function NotePopover({
  note,
  anchorRect,
  onChange,
  onDelete,
  onClose,
}: {
  note: Note
  anchorRect: DOMRect | null
  onChange: (text: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    taRef.current?.focus()
  }, [note.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current && !ref.current.contains(t) && !(t instanceof Element && t.closest('.note-hl'))) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [onClose])

  // Position below the anchor, clamped to the viewport.
  const W = 290
  const left = anchorRect ? Math.max(12, Math.min(anchorRect.left, window.innerWidth - W - 12)) : 12
  const belowSpace = anchorRect ? window.innerHeight - anchorRect.bottom : 0
  const top = anchorRect ? (belowSpace > 200 ? anchorRect.bottom + 8 : Math.max(12, anchorRect.top - 210)) : 80

  return (
    <div className="note-pop" ref={ref} style={{ left, top, width: W }}>
      {note.quote && <div className="note-quote">“{note.quote}”</div>}
      <textarea
        ref={taRef}
        className="note-text"
        rows={3}
        placeholder="Write a note…"
        value={note.text}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="note-actions">
        <button className="note-del" onClick={onDelete} title="Delete note">
          Delete
        </button>
        <button className="note-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
