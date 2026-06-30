import { useEffect, useState } from 'react'
import { currentBook, useBookStore } from '../store/useBookStore'
import { NotePopover } from './NotePopover'

// Notes in the reader: click a highlight to read/edit/delete; select text to
// add one. Creating edits the section body directly (no editor is mounted here,
// so there's no desync), and React re-paginates with the new highlight.
export function ReaderNotes() {
  const sections = useBookStore((s) => currentBook(s).sections)
  const notes = useBookStore((s) => currentBook(s).notes)
  const addNote = useBookStore((s) => s.addNote)
  const updateNote = useBookStore((s) => s.updateNote)
  const removeNote = useBookStore((s) => s.removeNote)
  const detachNoteAnchor = useBookStore((s) => s.detachNoteAnchor)
  const updateSectionBody = useBookStore((s) => s.updateSectionBody)

  const [active, setActive] = useState<{ id: string; rect: DOMRect | null } | null>(null)
  const [sel, setSel] = useState<DOMRect | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest?.('.note-hl') as HTMLElement | null
      const id = el?.getAttribute('data-note-id')
      if (id) {
        setActive({ id, rect: el!.getBoundingClientRect() })
        setSel(null)
      }
    }
    const onUp = () => {
      const s = window.getSelection()
      if (!s || s.isCollapsed || !s.toString().trim()) return setSel(null)
      const c = s.getRangeAt(0).commonAncestorContainer
      const el = c.nodeType === 1 ? (c as Element) : c.parentElement
      if (el?.closest('.rblock[data-section]') && el.closest('.page-content')) setSel(s.getRangeAt(0).getBoundingClientRect())
      else setSel(null)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  function createNote() {
    const s = window.getSelection()
    if (!s || s.isCollapsed) return
    const range = s.getRangeAt(0)
    const c = range.commonAncestorContainer
    const el = c.nodeType === 1 ? (c as Element) : c.parentElement
    const block = el?.closest('.rblock[data-section]') as HTMLElement | null
    if (!block) return
    const sectionId = block.getAttribute('data-section')!
    const bodyIndex = parseInt(block.getAttribute('data-bodyindex') || '-1', 10)
    const quote = s.toString()
    const id = addNote(sectionId, quote)

    const span = document.createElement('span')
    span.setAttribute('data-note-id', id)
    span.className = 'note-hl'
    try {
      range.surroundContents(span)
    } catch {
      span.appendChild(range.extractContents())
      range.insertNode(span)
    }
    const rect = span.getBoundingClientRect()
    const newBlockHtml = block.innerHTML

    const section = sections.find((x) => x.id === sectionId)
    if (section && bodyIndex >= 0) {
      const doc = new DOMParser().parseFromString(section.body, 'text/html')
      const child = doc.body.children[bodyIndex]
      if (child) {
        child.outerHTML = newBlockHtml
        updateSectionBody(sectionId, doc.body.innerHTML)
      }
    }
    s.removeAllRanges()
    setSel(null)
    setActive({ id, rect })
  }

  function del(id: string) {
    const note = notes.find((n) => n.id === id)
    if (note) detachNoteAnchor(note.sectionId, id)
    removeNote(id)
    setActive(null)
  }

  const activeNote = active && notes.find((n) => n.id === active.id)

  return (
    <>
      {sel && (
        <button
          className="note-add-btn"
          style={{ left: sel.left + sel.width / 2 - 40, top: sel.bottom + 8 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={createNote}
        >
          ✎ Note
        </button>
      )}
      {activeNote && (
        <NotePopover
          note={activeNote}
          anchorRect={active!.rect}
          onChange={(t) => updateNote(activeNote.id, t)}
          onDelete={() => del(activeNote.id)}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
