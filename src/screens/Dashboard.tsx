import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookStore } from '../store/useBookStore'
import type { Book } from '../types'
import { BOOK_STATUS_META } from '../lib/status'
import { mix } from '../lib/color'

function BookCover({ book }: { book: Book }) {
  const navigate = useNavigate()
  const switchBook = useBookStore((s) => s.switchBook)
  const m = BOOK_STATUS_META[book.status] ?? BOOK_STATUS_META.writing

  const open = () => {
    switchBook(book.id)
    navigate('/overview')
  }

  const accent = book.settings.accent
  // Minimal, flat cover — a whisper of light at the top, no leather/old-book look.
  const generated = { background: `linear-gradient(165deg, ${mix(accent, [255, 255, 255], 0.14)} 0%, ${accent} 72%)` }

  return (
    <div className="book-slot">
      <div
        className="book-cover"
        onClick={open}
        style={book.cover ? { backgroundImage: `url(${book.cover})` } : generated}
        title={`Open “${book.title || 'Untitled'}”`}
      >
        {!book.cover && (
          <div className="cover-gen">
            <div className="cover-title">{book.title || 'Untitled'}</div>
            {book.author && <div className="cover-author">{book.author}</div>}
          </div>
        )}
      </div>
      <div className="book-foot">
        <span className={`book-title-lbl${book.title ? '' : ' placeholder'}`}>{book.title || 'Untitled'}</span>
        <span className="book-status-tag" style={{ color: m.color }}>
          <span className="dot" />
          {m.label}
        </span>
      </div>
    </div>
  )
}

function AddBookSlot() {
  const navigate = useNavigate()
  const addBook = useBookStore((s) => s.addBook)
  return (
    <div className="book-slot">
      <button
        className="book-cover add"
        onClick={() => {
          addBook()
          navigate('/settings')
        }}
        title="Add a new book"
      >
        <span className="plus">+</span>
        <span className="add-label">New book</span>
      </button>
      <div className="book-foot" />
    </div>
  )
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function Dashboard() {
  const books = useBookStore((s) => s.books)
  const studioName = useBookStore((s) => s.studioName)
  const studioOwner = useBookStore((s) => s.studioOwner)
  const updateStudio = useBookStore((s) => s.updateStudio)

  // How many books fit per shelf, based on the shelf's real width.
  const shelvesRef = useRef<HTMLDivElement>(null)
  const [perRow, setPerRow] = useState(4)
  useEffect(() => {
    const el = shelvesRef.current
    if (!el) return
    const BOOK = 152
    const GAP = 36
    const compute = () => {
      const w = el.clientWidth
      const n = Math.max(2, Math.min(5, Math.floor((w + GAP) / (BOOK + GAP))))
      setPerRow(n)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const slots: (Book | 'add')[] = [...books, 'add']
  const shelves = chunk(slots, perRow)

  return (
    <main className="page dashboard">
      <header className="studio-head">
        <input
          className="studio-name"
          value={studioName}
          placeholder="Writing Studio"
          onChange={(e) => updateStudio({ studioName: e.target.value })}
        />
        <div className="studio-by">
          <span>from</span>
          <input
            className="studio-owner"
            value={studioOwner}
            placeholder="your name"
            size={Math.max(6, studioOwner.length + 1)}
            onChange={(e) => updateStudio({ studioOwner: e.target.value })}
          />
        </div>
      </header>

      <div className="shelves" ref={shelvesRef}>
        {shelves.map((shelf, i) => (
          <div className="shelf" key={i}>
            <div className="shelf-books">
              {shelf.map((item) =>
                item === 'add' ? <AddBookSlot key="add" /> : <BookCover key={item.id} book={item} />,
              )}
            </div>
            <div className="shelf-board" />
          </div>
        ))}
      </div>
    </main>
  )
}
