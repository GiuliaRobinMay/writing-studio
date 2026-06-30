// ───────────────────────────────────────────────────────────────────────────
// Big Tribe Builders — data model
// Workspace → Books → Chapters → Sections. Each book is fully independent
// (its own appearance, voice, references, and structure templates).
// Local-first: the whole workspace is a small JSON blob in IndexedDB.
// ───────────────────────────────────────────────────────────────────────────

export type Status =
  | 'not-started'
  | 'outlined'
  | 'drafting'
  | 'in-review'
  | 'revising'
  | 'finished'

// ── Chapter structure templates (user-defined, per book) ───────────────────
export interface TemplatePart {
  id: string
  /** Structural label, e.g. "Foundational Understanding". */
  label: string
  /** Grayed hint shown in the empty printed-title field. */
  placeholder: string
}

export interface ChapterTemplate {
  id: string
  name: string
  parts: TemplatePart[]
}

// ── Sections ───────────────────────────────────────────────────────────────
export interface Section {
  id: string
  chapterId: string
  /** Structural label from the template part ('' for a freeform section). */
  label: string
  /** Printed heading. Empty → the placeholder shows, fill in if you like. */
  title: string
  /** Grayed hint for the title when empty. */
  placeholder: string
  /** Rich text stored as HTML (TipTap). */
  body: string
  status: Status
  order: number
  /** Template part this came from, if any. */
  templatePartId?: string
  /** A short brief — what this section should be about — for AI-assisted drafting. */
  brief?: string
  /** BRAIN chunk refs (later milestone). */
  sources: string[]
  /** Reference refs. */
  citations: string[]
  updatedAt: number
}

export interface Chapter {
  id: string
  number: number
  title: string
  tagline: string
  status: Status
  order: number
  /** The structure this chapter follows; null = freeform (no structure). */
  templateId: string | null
  updatedAt: number
}

// ── Per-book settings ──────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark'

export interface BrainLink {
  name: string
  endpoint: string
  connected: boolean
}

export interface HouseStyle {
  bodyFont: string
  accent: string
  lineHeight: number
}

export interface Settings {
  theme: ThemeMode
  accent: string
  readingFont: string
  toneOfVoice: string
  grammarlyEnabled: boolean
  brain: BrainLink
}

export interface Reference {
  id: string
  author: string
  work: string
  idea: string
  phrasing: string
  citingChapters: string[]
}

// A margin note anchored to a highlighted span of text (the anchor lives in the
// section body HTML as <span data-note-id>; the content lives here).
export interface Note {
  id: string
  sectionId: string
  /** The highlighted text, for context in the note. */
  quote: string
  /** The note content. */
  text: string
  createdAt: number
}

// A piece of grounding material the author brings in (tier B: bring-your-own).
export type ResourceKind = 'paste' | 'upload' | 'gdrive' | 'gdocs' | 'notion' | 'apple' | 'other'

export interface Resource {
  id: string
  title: string
  kind: ResourceKind
  /** Verbatim text (the grounding). */
  text: string
  /** Provenance — filename, URL, or where it came from. */
  source?: string
  createdAt: number
}

// Book lifecycle, idea → published (shown on the library shelf).
export type BookStatus = 'idea' | 'outlining' | 'writing' | 'revising' | 'launching' | 'published'

// ── Book (a fully independent container) ────────────────────────────────────
export interface Book {
  id: string
  title: string
  author: string
  theme: string
  /** Lifecycle status for the library shelf. */
  status: BookStatus
  /** Optional cover image (data URL); falls back to a generated accent cover. */
  cover?: string
  houseStyle: HouseStyle
  settings: Settings
  references: Reference[]
  templates: ChapterTemplate[]
  chapters: Chapter[]
  sections: Section[]
  /** Answers to the book's foundation survey, keyed by question id. */
  about: Record<string, string>
  /** Bring-your-own grounding material. */
  resources: Resource[]
  /** Margin notes anchored to text in this book's sections. */
  notes: Note[]
  createdAt: number
  updatedAt: number
}

// ── Workspace (the whole studio) ────────────────────────────────────────────
export interface WorkspaceState {
  books: Book[]
  currentBookId: string
  /** Studio identity shown on the library dashboard. */
  studioName: string
  studioOwner: string
}
