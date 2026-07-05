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
export type SectionKind = 'section' | 'separator' | 'image'

export interface Section {
  id: string
  chapterId: string
  /** Block type: a writing section, a visual separator, or an image. */
  kind?: SectionKind
  /** For image blocks — the idb key (img:<id>) of the picture. */
  imageId?: string
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
  /** Research context: selected grounding passages + why each matters. */
  context?: SectionContext
  /** BRAIN chunk refs (superseded by `context`; kept for stored data). */
  sources: string[]
  /** Reference refs. */
  citations: string[]
  updatedAt: number
}

// A quote the author wants to use in a chapter.
export interface Quote {
  id: string
  text: string
  source: string
}

// An image attached to a chapter (data lives in a separate idb store: img:<id>).
export interface ChapterImage {
  id: string
  caption: string
  createdAt: number
}

// The per-chapter workspace: the brief (idea/purpose/outcome) you revisit, plus
// the raw materials (resources, quotes, images, notes) the chapter draws on.
export interface ChapterWorkspace {
  idea: string
  purpose: string
  outcome: string
  notes: string
  resources: Resource[]
  quotes: Quote[]
  images: ChapterImage[]
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
  /** Chapter-level brief + materials. */
  workspace?: ChapterWorkspace
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

// KDP-facing metadata gathered in the PUBLISH cockpit.
export interface PublishMeta {
  subtitle: string
  description: string
  keywords: string
  categories: string
  isbn: string
  trimSize: string
  ebookPrice: string
  launchDate: string
}

// The publish plan: metadata + which checklist items are done (by item id).
export interface PublishPlan {
  meta: PublishMeta
  done: Record<string, boolean>
}

// A back-end offer the book funnels readers toward (course, retreat, service…).
export interface GrowOffer {
  id: string
  name: string
  note: string
}

// The Grow plan: tracked metrics, tour checklist state, and the flywheel offers.
export interface GrowPlan {
  metrics: Record<string, string>
  done: Record<string, boolean>
  offers: GrowOffer[]
}

// ── Section research context (the KG grounding layer) ──────────────────────
// A grounding item the author picked from a research search (a corpus passage,
// a graph entity, or their own material) plus WHY it matters for this passage —
// the why is first-class: it is quoted in the drafting prompt and, later,
// written back to the author's knowledge graph as her own claim.

/** The author's reason a picked passage matters here. `text` is canonical —
 *  a voice note records alongside and transcribes into it (editable). */
export interface ContextWhy {
  text: string
  /** A voice note was kept for this why (audio lives in idb under vn:why-<itemId>). */
  hasAudio?: boolean
}

export type ContextItemKind = 'chunk' | 'entity' | 'resource'

export interface ContextItem {
  id: string
  kind: ContextItemKind
  /** chunk_id / node_id in the graph, or the Resource id for own material. */
  refId: string
  /** The passage (or entity gloss) that will ground the draft. */
  excerpt: string
  /** Provenance shown to the author and cited in the prompt. */
  source: string
  why?: ContextWhy
  /** The search query that surfaced it. */
  fromQuery?: string
  addedAt: number
}

export interface SectionContext {
  items: ContextItem[]
  /** True once a research search has returned — unlocks Advanced (graph) search. */
  searched: boolean
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
  /** The self-publish plan (PUBLISH cockpit). */
  publish?: PublishPlan
  /** The six-month Grow plan (GROW cockpit). */
  grow?: GrowPlan
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
