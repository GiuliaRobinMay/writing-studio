import { Mark, mergeAttributes } from '@tiptap/core'

// The note anchor: a highlight span carrying a note id. It lives inside the
// section body HTML, so the same highlight renders in the editor, focus mode,
// and the reader. The note's text content is stored separately in book.notes.
export const NoteMark = Mark.create({
  name: 'note',
  inclusive: false,
  excludes: '',
  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-note-id'),
        renderHTML: (attrs) => (attrs.noteId ? { 'data-note-id': attrs.noteId } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-note-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'note-hl' }), 0]
  },
})

/** Remove a note's highlight span from an HTML string, keeping its inner text. */
export function unwrapNote(html: string, noteId: string): string {
  if (!html) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(`span[data-note-id="${noteId}"]`).forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
  })
  return doc.body.innerHTML
}

/** Set of note ids currently anchored in an HTML string. */
export function anchoredNoteIds(html: string): Set<string> {
  const ids = new Set<string>()
  if (!html) return ids
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('span[data-note-id]').forEach((el) => {
    const id = el.getAttribute('data-note-id')
    if (id) ids.add(id)
  })
  return ids
}
