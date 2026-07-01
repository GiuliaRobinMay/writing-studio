import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type {
  Book,
  BookStatus,
  Chapter,
  ChapterTemplate,
  ChapterWorkspace,
  PublishMeta,
  Reference,
  Resource,
  ResourceKind,
  Section,
  Settings,
  Status,
  TemplatePart,
  WorkspaceState,
} from '../types'
import { unwrapNote } from '../lib/notemark'
import {
  BTB_ABOUT,
  BTB_TEMPLATE_ID,
  LEGACY_PART_ORDER,
  btbTemplate,
  buildWorkspace,
  defaultSettings,
  makeBook,
  makeChapter,
  makeSection,
  makeTemplate,
  makeTemplatePart,
  sectionsFromTemplate,
} from '../data/seed'

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await idbDel(name)
  },
}

interface Actions {
  hydrated: boolean
  _setHydrated: () => void

  // ── Workspace / books ──
  updateStudio: (patch: Partial<Pick<WorkspaceState, 'studioName' | 'studioOwner'>>) => void
  addBook: (title?: string, author?: string) => string
  switchBook: (bookId: string) => void
  removeBook: (bookId: string) => void
  updateBook: (patch: Partial<Pick<Book, 'title' | 'author' | 'theme'>>) => void
  setBookStatus: (bookId: string, status: BookStatus) => void
  setBookCover: (bookId: string, cover: string | undefined) => void

  // ── Settings / references (current book) ──
  updateSettings: (patch: Partial<Settings>) => void
  addReference: () => string
  updateReference: (id: string, patch: Partial<Omit<Reference, 'id'>>) => void
  removeReference: (id: string) => void

  updatePublishMeta: (patch: Partial<PublishMeta>) => void
  setPublishDone: (itemId: string, done: boolean) => void

  updateAbout: (key: string, value: string) => void
  addResource: (r: { title: string; kind: ResourceKind; text: string; source?: string }) => void
  updateResource: (id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => void
  removeResource: (id: string) => void

  addNote: (sectionId: string, quote: string) => string
  updateNote: (id: string, text: string) => void
  removeNote: (id: string) => void
  detachNoteAnchor: (sectionId: string, noteId: string) => void

  // ── Templates (current book) ──
  addTemplate: () => string
  updateTemplateName: (templateId: string, name: string) => void
  removeTemplate: (templateId: string) => void
  addTemplatePart: (templateId: string) => void
  updateTemplatePart: (templateId: string, partId: string, patch: Partial<Omit<TemplatePart, 'id'>>) => void
  removeTemplatePart: (templateId: string, partId: string) => void

  // ── Chapters (current book) ──
  addChapter: (templateId?: string | null) => string
  removeChapter: (chapterId: string) => void
  setChapterNumber: (chapterId: string, newNumber: number) => void
  setChapterStatus: (chapterId: string, status: Status) => void
  updateChapterMeta: (chapterId: string, patch: Partial<Pick<Chapter, 'title' | 'tagline'>>) => void
  updateChapterWorkspace: (chapterId: string, patch: Partial<ChapterWorkspace>) => void
  reorderChapters: (orderedIds: string[]) => void
  applyStructure: (chapterId: string, templateId: string | null) => void

  // ── Sections (current book) ──
  updateSectionBody: (sectionId: string, body: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void
  updateSectionBrief: (sectionId: string, brief: string) => void
  setSectionStatus: (sectionId: string, status: Status) => void
  addSection: (chapterId: string) => void
  insertSection: (chapterId: string, index: number) => void
  removeSection: (sectionId: string) => void
  reorderSections: (chapterId: string, orderedIds: string[]) => void

  resetToSeed: () => void
}

type Store = WorkspaceState & Actions

const SEED_TIME = 1719700000000

function renumber(chapters: Chapter[], now: number): Chapter[] {
  return [...chapters]
    .sort((a, b) => a.order - b.order)
    .map((ch, i) => ({ ...ch, order: i, number: i + 1, updatedAt: now }))
}

export function emptyWorkspace(): ChapterWorkspace {
  return { idea: '', purpose: '', outcome: '', notes: '', resources: [], quotes: [], images: [] }
}

export function emptyPublish() {
  return {
    meta: { subtitle: '', description: '', keywords: '', categories: '', isbn: '', trimSize: '', ebookPrice: '', launchDate: '' },
    done: {} as Record<string, boolean>,
  }
}

const stripHtml = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

function chapterIsEmpty(sections: Section[], chapterId: string): boolean {
  return sections
    .filter((s) => s.chapterId === chapterId)
    .every((s) => !s.title.trim() && !stripHtml(s.body))
}

export const useBookStore = create<Store>()(
  persist(
    (set) => {
      // Patch whichever book is current, bumping its updatedAt.
      const patchBook = (fn: (b: Book) => Book) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === s.currentBookId ? { ...fn(b), updatedAt: Date.now() } : b,
          ),
        }))

      const mapSections = (b: Book, fn: (s: Section) => Section): Book => ({
        ...b,
        sections: b.sections.map(fn),
      })

      return {
        ...buildWorkspace(SEED_TIME),
        hydrated: false,
        _setHydrated: () => set({ hydrated: true }),

        // ── Workspace / books ──
        updateStudio: (patch) => set(patch),
        addBook: (title = 'Untitled Book', author = '') => {
          const book = makeBook(title, author, Date.now())
          set((s) => ({ books: [...s.books, book], currentBookId: book.id }))
          return book.id
        },
        setBookStatus: (bookId, status) =>
          set((s) => ({
            books: s.books.map((b) => (b.id === bookId ? { ...b, status, updatedAt: Date.now() } : b)),
          })),
        setBookCover: (bookId, cover) =>
          set((s) => ({
            books: s.books.map((b) => (b.id === bookId ? { ...b, cover, updatedAt: Date.now() } : b)),
          })),
        switchBook: (bookId) => set({ currentBookId: bookId }),
        removeBook: (bookId) =>
          set((s) => {
            if (s.books.length <= 1) return {}
            const books = s.books.filter((b) => b.id !== bookId)
            const currentBookId =
              s.currentBookId === bookId ? books[0].id : s.currentBookId
            return { books, currentBookId }
          }),
        updateBook: (patch) => patchBook((b) => ({ ...b, ...patch })),

        // ── Settings / references ──
        updateSettings: (patch) => patchBook((b) => ({ ...b, settings: { ...b.settings, ...patch } })),

        addReference: () => {
          const id = `ref-${Date.now().toString(36)}`
          patchBook((b) => ({
            ...b,
            references: [...b.references, { id, author: '', work: '', idea: '', phrasing: '', citingChapters: [] }],
          }))
          return id
        },
        updateReference: (id, patch) =>
          patchBook((b) => ({
            ...b,
            references: b.references.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          })),
        removeReference: (id) =>
          patchBook((b) => ({ ...b, references: b.references.filter((r) => r.id !== id) })),

        // ── Publish plan ──
        updatePublishMeta: (patch) =>
          patchBook((b) => {
            const pub = b.publish ?? emptyPublish()
            return { ...b, publish: { ...pub, meta: { ...pub.meta, ...patch } } }
          }),
        setPublishDone: (itemId, done) =>
          patchBook((b) => {
            const pub = b.publish ?? emptyPublish()
            return { ...b, publish: { ...pub, done: { ...pub.done, [itemId]: done } } }
          }),

        // ── Foundation: survey + resources ──
        updateAbout: (key, value) =>
          patchBook((b) => ({ ...b, about: { ...b.about, [key]: value } })),
        addResource: (r) =>
          patchBook((b) => ({
            ...b,
            resources: [
              ...b.resources,
              { id: `res-${Date.now().toString(36)}-${b.resources.length}`, createdAt: Date.now(), ...r },
            ],
          })),
        updateResource: (id, patch) =>
          patchBook((b) => ({
            ...b,
            resources: b.resources.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        removeResource: (id) =>
          patchBook((b) => ({ ...b, resources: b.resources.filter((x) => x.id !== id) })),

        // ── Margin notes ──
        addNote: (sectionId, quote) => {
          const id = `note-${Date.now().toString(36)}-${Math.round(performance.now())}`
          patchBook((b) => ({
            ...b,
            notes: [...b.notes, { id, sectionId, quote, text: '', createdAt: Date.now() }],
          }))
          return id
        },
        updateNote: (id, text) =>
          patchBook((b) => ({ ...b, notes: b.notes.map((n) => (n.id === id ? { ...n, text } : n)) })),
        // Content only — used when the editor already removed the anchor mark.
        removeNote: (id) => patchBook((b) => ({ ...b, notes: b.notes.filter((n) => n.id !== id) })),
        // Body only — strip the highlight span (used in reader, no editor mounted).
        detachNoteAnchor: (sectionId, noteId) =>
          patchBook((b) => ({
            ...b,
            sections: b.sections.map((s) =>
              s.id === sectionId ? { ...s, body: unwrapNote(s.body, noteId), updatedAt: Date.now() } : s,
            ),
          })),

        // ── Templates ──
        addTemplate: () => {
          const tpl = makeTemplate()
          patchBook((b) => ({ ...b, templates: [...b.templates, tpl] }))
          return tpl.id
        },
        updateTemplateName: (templateId, name) =>
          patchBook((b) => ({
            ...b,
            templates: b.templates.map((t) => (t.id === templateId ? { ...t, name } : t)),
          })),
        removeTemplate: (templateId) =>
          patchBook((b) => ({
            ...b,
            templates: b.templates.filter((t) => t.id !== templateId),
            // Chapters that referenced it become freeform (sections kept).
            chapters: b.chapters.map((c) => (c.templateId === templateId ? { ...c, templateId: null } : c)),
          })),
        addTemplatePart: (templateId) =>
          patchBook((b) => ({
            ...b,
            templates: b.templates.map((t) =>
              t.id === templateId ? { ...t, parts: [...t.parts, makeTemplatePart()] } : t,
            ),
          })),
        updateTemplatePart: (templateId, partId, patch) =>
          patchBook((b) => ({
            ...b,
            templates: b.templates.map((t) =>
              t.id === templateId
                ? { ...t, parts: t.parts.map((p) => (p.id === partId ? { ...p, ...patch } : p)) }
                : t,
            ),
          })),
        removeTemplatePart: (templateId, partId) =>
          patchBook((b) => ({
            ...b,
            templates: b.templates.map((t) =>
              t.id === templateId ? { ...t, parts: t.parts.filter((p) => p.id !== partId) } : t,
            ),
          })),

        // ── Chapters ──
        addChapter: (templateId = null) => {
          const now = Date.now()
          let createdId = ''
          patchBook((b) => {
            const template = templateId ? b.templates.find((t) => t.id === templateId) : undefined
            const { chapter, sections } = makeChapter(b.chapters.length + 1, now, template)
            createdId = chapter.id
            return {
              ...b,
              chapters: renumber([...b.chapters, chapter], now),
              sections: [...b.sections, ...sections],
            }
          })
          return createdId
        },
        removeChapter: (chapterId) =>
          patchBook((b) => ({
            ...b,
            chapters: renumber(b.chapters.filter((c) => c.id !== chapterId), Date.now()),
            sections: b.sections.filter((s) => s.chapterId !== chapterId),
            references: b.references.map((r) => ({
              ...r,
              citingChapters: r.citingChapters.filter((c) => c !== chapterId),
            })),
          })),
        setChapterNumber: (chapterId, newNumber) =>
          patchBook((b) => {
            const ordered = [...b.chapters].sort((a, c) => a.order - c.order)
            const from = ordered.findIndex((c) => c.id === chapterId)
            if (from < 0) return b
            const target = Math.max(1, Math.min(newNumber, ordered.length)) - 1
            const [moved] = ordered.splice(from, 1)
            ordered.splice(target, 0, moved)
            ordered.forEach((c, i) => (c.order = i))
            return { ...b, chapters: renumber(ordered, Date.now()) }
          }),
        setChapterStatus: (chapterId, status) =>
          patchBook((b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId ? { ...c, status, updatedAt: Date.now() } : c,
            ),
          })),
        updateChapterMeta: (chapterId, patch) =>
          patchBook((b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId ? { ...c, ...patch, updatedAt: Date.now() } : c,
            ),
          })),
        updateChapterWorkspace: (chapterId, patch) =>
          patchBook((b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId
                ? { ...c, workspace: { ...emptyWorkspace(), ...c.workspace, ...patch }, updatedAt: Date.now() }
                : c,
            ),
          })),
        reorderChapters: (orderedIds) =>
          patchBook((b) => ({
            ...b,
            chapters: renumber(
              b.chapters.map((c) => ({ ...c, order: orderedIds.indexOf(c.id) })),
              Date.now(),
            ),
          })),
        applyStructure: (chapterId, templateId) =>
          patchBook((b) => {
            const now = Date.now()
            const chapters = b.chapters.map((c) =>
              c.id === chapterId ? { ...c, templateId, updatedAt: now } : c,
            )
            if (!templateId) return { ...b, chapters }
            const tpl = b.templates.find((t) => t.id === templateId)
            if (!tpl) return { ...b, chapters }
            const fresh = sectionsFromTemplate(chapterId, tpl, now)
            // Replace if the chapter is still empty; otherwise append (no loss).
            const empty = chapterIsEmpty(b.sections, chapterId)
            const kept = empty
              ? b.sections.filter((s) => s.chapterId !== chapterId)
              : b.sections
            const offset = empty ? 0 : b.sections.filter((s) => s.chapterId === chapterId).length
            const placed = fresh.map((s, i) => ({ ...s, order: offset + i + 1 }))
            return { ...b, chapters, sections: [...kept, ...placed] }
          }),

        // ── Sections ──
        updateSectionBody: (sectionId, body) =>
          patchBook((b) => mapSections(b, (s) => (s.id === sectionId ? { ...s, body, updatedAt: Date.now() } : s))),
        updateSectionTitle: (sectionId, title) =>
          patchBook((b) => mapSections(b, (s) => (s.id === sectionId ? { ...s, title, updatedAt: Date.now() } : s))),
        updateSectionBrief: (sectionId, brief) =>
          patchBook((b) => mapSections(b, (s) => (s.id === sectionId ? { ...s, brief, updatedAt: Date.now() } : s))),
        setSectionStatus: (sectionId, status) =>
          patchBook((b) => mapSections(b, (s) => (s.id === sectionId ? { ...s, status, updatedAt: Date.now() } : s))),
        addSection: (chapterId) =>
          patchBook((b) => {
            const order = b.sections.filter((s) => s.chapterId === chapterId).length + 1
            return { ...b, sections: [...b.sections, makeSection(chapterId, order, Date.now())] }
          }),
        // Insert a blank section at a position among the chapter's sections.
        insertSection: (chapterId, index) =>
          patchBook((b) => {
            const secs = b.sections
              .filter((s) => s.chapterId === chapterId)
              .sort((a, c) => a.order - c.order)
            const at = Math.max(0, Math.min(index, secs.length))
            secs.splice(at, 0, makeSection(chapterId, 0, Date.now()))
            const renum = secs.map((s, i) => ({ ...s, order: i + 1 }))
            const others = b.sections.filter((s) => s.chapterId !== chapterId)
            return { ...b, sections: [...others, ...renum] }
          }),
        // Never let a chapter drop below one section (mono-section chapters stay usable).
        removeSection: (sectionId) =>
          patchBook((b) => {
            const sec = b.sections.find((s) => s.id === sectionId)
            if (!sec) return b
            const count = b.sections.filter((s) => s.chapterId === sec.chapterId).length
            if (count <= 1) return b
            return { ...b, sections: b.sections.filter((s) => s.id !== sectionId) }
          }),
        reorderSections: (chapterId, orderedIds) =>
          patchBook((b) => ({
            ...b,
            sections: b.sections.map((s) =>
              s.chapterId === chapterId ? { ...s, order: orderedIds.indexOf(s.id) + 1 } : s,
            ),
          })),

        resetToSeed: () => set({ ...buildWorkspace(Date.now()) }),
      }
    },
    {
      name: 'big-tribe-builders',
      version: 6,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        books: s.books,
        currentBookId: s.currentBookId,
        studioName: s.studioName,
        studioOwner: s.studioOwner,
      }),
      migrate: (persisted: any, version) => {
        // v1/v2 stored a single book: { book, chapters, sections, settings?, references? }
        if (version < 3 && persisted && persisted.book) {
          const now = Date.now()
          const tpl = btbTemplate()
          const meta = tpl.parts // [{id,label,placeholder}] in canonical order
          const sections: Section[] = (persisted.sections ?? []).map((s: any, i: number) => {
            const idx = LEGACY_PART_ORDER.indexOf(s.partType)
            const part = idx >= 0 ? meta[idx] : undefined
            return {
              id: s.id ?? `sec-mig-${i}`,
              chapterId: s.chapterId,
              label: part?.label ?? '',
              title: s.title ?? '',
              placeholder: part?.placeholder ?? 'Section title…',
              body: s.body ?? '',
              status: s.status ?? 'not-started',
              order: s.order ?? i + 1,
              templatePartId: part?.id,
              sources: s.sources ?? [],
              citations: s.citations ?? [],
              updatedAt: s.updatedAt ?? now,
            }
          })
          const chapters: Chapter[] = (persisted.chapters ?? []).map((c: any) => ({
            id: c.id,
            number: c.number,
            title: c.title ?? '',
            tagline: c.tagline ?? '',
            status: c.status ?? 'not-started',
            order: c.order ?? c.number ?? 0,
            templateId: BTB_TEMPLATE_ID,
            updatedAt: c.updatedAt ?? now,
          }))
          const book: Book = {
            id: 'book-btb',
            title: persisted.book.title ?? 'Big Tribe Builders',
            author: persisted.book.author ?? 'Giulia',
            theme: persisted.book.theme ?? '',
            status: 'writing',
            houseStyle: persisted.book.houseStyle ?? { bodyFont: 'Georgia, serif', accent: '#8B5A3C', lineHeight: 1.65 },
            settings: persisted.settings ?? defaultSettings(),
            references: persisted.references ?? [],
            templates: [tpl],
            chapters,
            sections,
            about: {},
            resources: [],
            notes: [],
            createdAt: now,
            updatedAt: now,
          }
          return { books: [book], currentBookId: book.id, studioName: 'Writing Studio', studioOwner: 'Giulia May' }
        }
        // v3 → v4 added book.status/cover and the studio identity.
        if (version < 4 && persisted && persisted.books) {
          persisted.books = persisted.books.map((b: any) => ({ ...b, status: b.status ?? 'writing' }))
          if (persisted.studioName === undefined) persisted.studioName = 'Writing Studio'
          if (persisted.studioOwner === undefined) persisted.studioOwner = 'Giulia May'
        }
        // v4 → v5 added the foundation survey + resource library.
        if (version < 5 && persisted && persisted.books) {
          persisted.books = persisted.books.map((b: any) => {
            const about = b.about ?? {}
            // Prefill the known BTB foundation if it's still empty (additive only).
            const seeded = b.id === 'book-btb' && Object.keys(about).length === 0 ? { ...BTB_ABOUT } : about
            return { ...b, about: seeded, resources: b.resources ?? [] }
          })
        }
        // v5 → v6 added margin notes.
        if (version < 6 && persisted && persisted.books) {
          persisted.books = persisted.books.map((b: any) => ({ ...b, notes: b.notes ?? [] }))
        }
        return persisted
      },
      // Runs on every hydrate (after any migrate) — guarantees required fields
      // exist so a partially-written record can never crash the app.
      merge: (persisted, current) => {
        const p = persisted as Partial<WorkspaceState> | undefined
        if (!p || !p.books) return { ...current, ...(p as object) }
        const books = p.books.map((b) => {
          const about = b.about ?? {}
          const seeded = b.id === 'book-btb' && Object.keys(about).length === 0 ? { ...BTB_ABOUT } : about
          return { ...b, status: b.status ?? 'writing', about: seeded, resources: b.resources ?? [], notes: b.notes ?? [] }
        })
        return {
          ...current,
          ...p,
          books,
          currentBookId: p.currentBookId ?? current.currentBookId,
          studioName: p.studioName ?? current.studioName,
          studioOwner: p.studioOwner ?? current.studioOwner,
        }
      },
      onRehydrateStorage: () => (state) => {
        state?._setHydrated()
      },
    },
  ),
)

// ── Derived selectors ───────────────────────────────────────────────────────

/** The current book (always defined — workspace seeds at least one). */
export function currentBook(s: Store): Book {
  return s.books.find((b) => b.id === s.currentBookId) ?? s.books[0]
}

export function sectionsOf(sections: Section[], chapterId: string): Section[] {
  return sections.filter((s) => s.chapterId === chapterId).sort((a, b) => a.order - b.order)
}

export function chaptersSorted(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.order - b.order)
}

export function templateName(templates: ChapterTemplate[], id: string | null): string {
  if (!id) return 'No structure'
  return templates.find((t) => t.id === id)?.name ?? 'No structure'
}
