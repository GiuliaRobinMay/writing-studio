import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditor, EditorContent, BubbleMenu, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import type { Section } from '../types'
import { currentBook, useBookStore } from '../store/useBookStore'
import { StatusSelect } from './StatusChip'
import { NotePopover } from './NotePopover'
import { countWords, isHtmlEmpty } from '../lib/text'
import { Uppercase } from '../lib/uppercase'
import { NoteMark } from '../lib/notemark'

/** Treat an editor that holds only empty markup as truly empty. */
const norm = (html: string) => (isHtmlEmpty(html) ? '' : html)

// Floating toolbar shown over a text selection (no permanent toolbar).
function FloatingToolbar({ editor, onNote }: { editor: Editor; onNote?: () => void }) {
  const btn = (active: boolean) => `tb-btn${active ? ' on' : ''}`
  const stop = (e: React.MouseEvent) => e.preventDefault()
  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 120, maxWidth: 'none' }} className="bubble">
      <button className={btn(editor.isActive('bold'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" style={{ fontWeight: 800 }}>
        B
      </button>
      <button className={btn(editor.isActive('italic'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" style={{ fontStyle: 'italic' }}>
        i
      </button>
      <button className={btn(editor.isActive('underline'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" style={{ textDecoration: 'underline' }}>
        U
      </button>
      <button className={btn(editor.isActive('strike'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" style={{ textDecoration: 'line-through' }}>
        S
      </button>
      <button className={btn(editor.isActive('uppercase'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleMark('uppercase').run()} title="All caps" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
        AA
      </button>
      <span className="tb-sep" />
      <button className={btn(editor.isActive('heading', { level: 1 }))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        H1
      </button>
      <button className={btn(editor.isActive('heading', { level: 2 }))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        H2
      </button>
      <button className={btn(editor.isActive('paragraph'))} onMouseDown={stop} onClick={() => editor.chain().focus().setParagraph().run()} title="Body text">
        Body
      </button>
      <span className="tb-sep" />
      <button className={btn(editor.isActive('bulletList'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        •
      </button>
      <button className={btn(editor.isActive('orderedList'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        1.
      </button>
      <button className={btn(editor.isActive('blockquote'))} onMouseDown={stop} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        ❝
      </button>
      {onNote && (
        <>
          <span className="tb-sep" />
          <button className="tb-btn note" onMouseDown={stop} onClick={onNote} title="Add a note">
            ✎
          </button>
        </>
      )}
    </BubbleMenu>
  )
}

/** The reusable writing surface — title + rich-text body — used by both the
 *  stacked editor and the single-section focus mode. */
export function SectionWriter({
  section,
  onWords,
  titleClass = 'sec-edit-title',
}: {
  section: Section
  onWords?: (n: number) => void
  titleClass?: string
}) {
  const updateBody = useBookStore((s) => s.updateSectionBody)
  const updateTitle = useBookStore((s) => s.updateSectionTitle)
  const grammarly = useBookStore((s) => currentBook(s).settings.grammarlyEnabled)
  const notes = useBookStore((s) => currentBook(s).notes)
  const addNote = useBookStore((s) => s.addNote)
  const updateNote = useBookStore((s) => s.updateNote)
  const removeNote = useBookStore((s) => s.removeNote)
  const saveTimer = useRef<number | undefined>(undefined)
  const [activeNote, setActiveNote] = useState<{ id: string; rect: DOMRect | null } | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Uppercase,
      NoteMark,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: section.body || '',
    onUpdate: ({ editor }) => {
      onWords?.(countWords(editor.getHTML()))
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => updateBody(section.id, norm(editor.getHTML())), 400)
    },
  })

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimer.current)
      if (editor) updateBody(section.id, norm(editor.getHTML()))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Let the user's Grammarly browser extension run inside the editor (or not).
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement
    const flag = grammarly ? 'true' : 'false'
    dom.setAttribute('data-gramm', flag)
    dom.setAttribute('data-gramm_editor', flag)
    dom.setAttribute('data-enable-grammarly', flag)
    dom.setAttribute('spellcheck', flag)
  }, [editor, grammarly])

  // Click a highlight → open its note.
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    const onClick = (e: Event) => {
      const el = (e.target as Element).closest?.('.note-hl') as HTMLElement | null
      const id = el?.getAttribute('data-note-id')
      if (id) setActiveNote({ id, rect: el!.getBoundingClientRect() })
    }
    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor])

  function handleAddNote() {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const quote = editor.state.doc.textBetween(from, to, ' ')
    const id = addNote(section.id, quote)
    editor.chain().focus().setMark('note', { noteId: id }).run()
    requestAnimationFrame(() => {
      const el = editor.view.dom.querySelector(`[data-note-id="${id}"]`) as HTMLElement | null
      setActiveNote({ id, rect: el?.getBoundingClientRect() ?? null })
    })
  }

  function deleteActiveNote(id: string) {
    if (editor) {
      let at = -1
      editor.state.doc.descendants((node, pos) => {
        if (at >= 0) return false
        if (node.marks.some((m) => m.type.name === 'note' && m.attrs.noteId === id)) at = pos
      })
      if (at >= 0) editor.chain().setTextSelection(at).extendMarkRange('note').unsetMark('note').run()
    }
    removeNote(id)
    setActiveNote(null)
  }

  const active = activeNote && notes.find((n) => n.id === activeNote.id)

  return (
    <>
      <input
        className={titleClass}
        value={section.title}
        onChange={(e) => updateTitle(section.id, e.target.value)}
        placeholder={section.placeholder || 'Section heading…'}
      />
      {editor && <FloatingToolbar editor={editor} onNote={handleAddNote} />}
      <EditorContent editor={editor} className="prose-edit" />
      {active && (
        <NotePopover
          note={active}
          anchorRect={activeNote!.rect}
          onChange={(text) => updateNote(active.id, text)}
          onDelete={() => deleteActiveNote(active.id)}
          onClose={() => setActiveNote(null)}
        />
      )}
    </>
  )
}

export function SectionEditor({
  section,
  dragHandle,
  canDelete = true,
}: {
  section: Section
  dragHandle?: ReactNode
  canDelete?: boolean
}) {
  const navigate = useNavigate()
  const setStatus = useBookStore((s) => s.setSectionStatus)
  const removeSection = useBookStore((s) => s.removeSection)
  const [words, setWords] = useState(() => countWords(section.body))

  return (
    <section className="sec-edit" id={section.id}>
      <div className="sec-edit-head">
        {dragHandle}
        <span className="sec-edit-part">{section.label || 'Section'}</span>
        <div className="sec-edit-meta">
          <span className="wc">{words.toLocaleString()} words</span>
          <StatusSelect status={section.status} onChange={(s) => setStatus(section.id, s)} stop={false} />
          <button
            className="sec-focus"
            title="Focus on this section"
            onClick={() => navigate(`/chapter/${section.chapterId}/section/${section.id}`)}
          >
            ⤢
          </button>
          {canDelete && (
            <button
              className="sec-del"
              title="Delete section"
              onClick={() => {
                if (confirm('Delete this section? Its text will be lost.')) removeSection(section.id)
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <SectionWriter section={section} onWords={setWords} />
    </section>
  )
}
