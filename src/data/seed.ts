import type {
  Book,
  Chapter,
  ChapterTemplate,
  Reference,
  Section,
  Settings,
  Status,
  TemplatePart,
  WorkspaceState,
} from '../types'

// ───────────────────────────────────────────────────────────────────────────
// Seed: the workspace ships with one book — Big Tribe Builders — using the
// locked 7+1 structure as its default (editable) template. New books and new
// chapters start blank with grayed placeholders.
// ───────────────────────────────────────────────────────────────────────────

interface ChapterSeed {
  number: number
  title: string
  tagline: string
  topic: string
  status: Status
}

const CHAPTERS: ChapterSeed[] = [
  { number: 1, title: 'The Personal Manifesto', tagline: 'Know yourself before you build for others', topic: 'your manifesto', status: 'finished' },
  { number: 2, title: 'The Gift', tagline: "How will you truly make members' lives better?", topic: 'the gift', status: 'finished' },
  { number: 3, title: 'Activity Rituals', tagline: 'From inventory to action-driven experience', topic: 'rituals', status: 'finished' },
  { number: 4, title: 'Architecture & Design', tagline: 'Your community is a village — design it like one', topic: 'architecture', status: 'finished' },
  { number: 5, title: 'Belonging', tagline: 'You only have a community when people feel they belong', topic: 'belonging', status: 'in-review' },
  { number: 6, title: 'The Story', tagline: 'Content strategy as the ongoing thread of your community', topic: 'the story', status: 'revising' },
  { number: 7, title: 'Relating', tagline: 'Community is a feeling — build it intentionally', topic: 'relating', status: 'drafting' },
  { number: 8, title: 'Culture', tagline: 'You model the behaviour you want to see', topic: 'culture', status: 'drafting' },
  { number: 9, title: 'Legacy & Value', tagline: 'Your community is your living archive', topic: 'legacy', status: 'outlined' },
  { number: 10, title: 'The Cycle', tagline: 'Every stage of growth needs different leadership', topic: 'the cycle', status: 'outlined' },
  { number: 11, title: 'Operations', tagline: 'The systems that keep your community alive', topic: 'operations', status: 'not-started' },
  { number: 12, title: 'Money', tagline: 'Monetisation tensions, models, and hard truths', topic: 'money', status: 'not-started' },
  { number: 13, title: 'Tools', tagline: 'The stack that powers a polished community', topic: 'your tools', status: 'not-started' },
  { number: 14, title: 'The Playground', tagline: 'Build the world outside your walls', topic: 'the playground', status: 'not-started' },
  { number: 15, title: 'The Visionary Host', tagline: 'Growth, marketing, and the long game', topic: 'the long game', status: 'not-started' },
]

interface PartDef {
  label: string
  placeholder: string
  title: (topic: string) => string
  body: (topic: string, chTitle: string) => string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const p = (...paras: string[]) => paras.map((t) => `<p>${t}</p>`).join('\n')

// The 8 locked parts of the Big Tribe Builders structure.
const PARTS: PartDef[] = [
  {
    label: 'Foundational Understanding',
    placeholder: 'The teaching — what the host needs to understand…',
    title: (t) => `Why ${t} is slower — and stronger — than you think`,
    body: (t, ch) =>
      p(
        `Before you do anything with ${t}, take a breath. The work of "${ch}" is not a sprint, and the host who treats it like one is the host who burns out by month three. Community building compounds the way slow cooking does: nothing looks like it is happening, and then everything is.`,
        `Here is what you need to understand first. ${cap(t)} is not a tactic you deploy; it is a condition you cultivate. Your members can feel the difference between a host who is performing and a host who is present. This chapter is about becoming the second kind.`,
        `As Aaron Dignan reminds us, a community is a living system, not a machine to be optimised. You are not assembling parts. You are tending something that grows on its own timeline — usually a slower one than your ambition would like.`,
      ),
  },
  {
    label: 'Paradoxes',
    placeholder: 'The tensions and contradictions inside this topic…',
    title: (t) => `The contradictions hiding inside ${t}`,
    body: (t) =>
      p(
        `Every meaningful part of community building contains a paradox, and ${t} is no exception. The more you try to control it, the less alive it becomes. The more you let go, the more it asks of you.`,
        `Hold two truths at once: you must lead deliberately, and you must leave room for what you did not plan. The host who only plans builds a museum. The host who only improvises builds a crowd. You are building neither — you are building a village.`,
      ),
  },
  {
    label: 'Exploring the Different Roles',
    placeholder: 'Host perspective, then member perspective…',
    title: () => `Two chairs at the same table`,
    body: (t) =>
      p(
        `<strong>From where you sit (the host).</strong> You see ${t} as architecture and intention — the load-bearing decisions only you can make. Your job is to hold the frame so steadily that no one notices the frame at all.`,
        `<strong>From where they sit (the member).</strong> Your member does not see your strategy. They feel whether they are welcome, whether they matter, whether this place is for someone like them. Sit in their chair often. It is the only view that tells you the truth.`,
      ),
  },
  {
    label: 'Across the Growth Stages',
    placeholder: 'Enthusiast, Builder, and Visionary phases…',
    title: () => `What this looks like at 50, at 500, at 5,000`,
    body: (t) =>
      p(
        `<strong>Enthusiast Phase — 0–250 members, first 6 months.</strong> ${cap(t)} is intimate and hands-on. You know names. You greet people personally. Win one true fan a day; resist the urge to measure anything else.`,
        `<strong>Builder Phase — 250–1,000 members, 6–18 months.</strong> You can no longer be everywhere, so ${t} has to live in rituals and in the members you have empowered. Your role shifts from doing to designing.`,
        `<strong>Visionary Phase — 1,000+ members, 18 months and beyond.</strong> ${cap(t)} now belongs to the community as much as to you. Your work is to protect the culture and to let leaders emerge who will outlast your attention.`,
      ),
  },
  {
    label: 'In Action & Implementation',
    placeholder: 'Implementation strategies and concrete moves…',
    title: (t) => `Putting ${t} to work this week`,
    body: (t) =>
      p(
        `Strategy without action is just a nicer kind of procrastination. Here is how ${t} becomes real in practice — not as a grand launch, but as small, repeatable moves that accumulate.`,
        `Start with one thing you can sustain. A weekly gesture you can keep for a year beats a brilliant one you abandon in a month. Consistency is the whole secret, and it is unglamorous on purpose.`,
      ),
  },
  {
    label: 'Questions for You',
    placeholder: 'Questions for the reader to sit with…',
    title: () => `Sit with these before you turn the page`,
    body: (t) =>
      p(
        `These questions do not have right answers. They have <em>your</em> answers, and finding them is the work.`,
        `• What would ${t} look like if you trusted your community more than you do today?<br/>• Where are you rushing something that only patience can grow?<br/>• Who in your community is ready to carry a piece of this with you?`,
      ),
  },
  {
    label: 'Exercise',
    placeholder: 'A short, doable exercise…',
    title: () => `An exercise: one small, honest move`,
    body: (t) =>
      p(
        `Take fifteen minutes. Write down the single smallest version of ${t} you could put into the world this week — small enough that it feels almost too easy.`,
        `Then do it, and notice what happens. Not the metrics — the feeling. The slow path rewards the host who pays attention to feeling long before the numbers catch up.`,
      ),
  },
  {
    label: 'A Note from Giulia',
    placeholder: "A short, warm, personal word — signed “— Giulia”…",
    title: () => `A note from Giulia`,
    body: (t) =>
      p(
        `I know how badly you want this to work, and how quickly. I felt it too. But the communities I have seen last are the ones whose hosts made peace with slow — who kept showing up for ${t} long after the early excitement faded.`,
        `You are not behind. You are exactly on time for the kind of thing that takes time. Keep going. I'm right here with you.`,
        `— Giulia`,
      ),
  },
]

export const BTB_TEMPLATE_ID = 'tpl-btb'

// Order of the legacy `partType` enum (pre-multi-book) → index into the
// default template, used when migrating old saved data.
export const LEGACY_PART_ORDER = [
  'foundational',
  'paradoxes',
  'roles',
  'growth-stages',
  'in-action',
  'questions',
  'exercise',
  'note-from-giulia',
]

export function btbTemplate(): ChapterTemplate {
  const parts: TemplatePart[] = PARTS.map((part, i) => ({
    id: `${BTB_TEMPLATE_ID}-p${i + 1}`,
    label: part.label,
    placeholder: part.placeholder,
  }))
  return { id: BTB_TEMPLATE_ID, name: 'Big Tribe Builders (7+1)', parts }
}

function sectionStatusesFor(chapterStatus: Status): Status[] {
  switch (chapterStatus) {
    case 'finished':
      return Array(8).fill('finished')
    case 'in-review':
      return ['finished', 'finished', 'in-review', 'in-review', 'in-review', 'drafting', 'drafting', 'in-review']
    case 'revising':
      return ['finished', 'revising', 'revising', 'drafting', 'drafting', 'outlined', 'outlined', 'drafting']
    case 'drafting':
      return ['drafting', 'drafting', 'outlined', 'outlined', 'outlined', 'not-started', 'not-started', 'drafting']
    case 'outlined':
      return ['outlined', 'outlined', 'not-started', 'not-started', 'not-started', 'not-started', 'not-started', 'not-started']
    default:
      return Array(8).fill('not-started')
  }
}

/** Seed sections for a BTB chapter — keeps the demo prose + tagline titles. */
function btbSectionsForChapter(
  chapterId: string,
  topic: string,
  chTitle: string,
  statuses: Status[],
  now: number,
): Section[] {
  return PARTS.map((part, i) => {
    const status = statuses[i] ?? 'not-started'
    const hasProse = status !== 'not-started'
    return {
      id: `${chapterId}-s${i + 1}`,
      chapterId,
      label: part.label,
      title: part.title(topic),
      placeholder: part.placeholder,
      body: hasProse ? part.body(topic, chTitle) : '',
      status,
      order: i + 1,
      templatePartId: `${BTB_TEMPLATE_ID}-p${i + 1}`,
      sources: [],
      citations: [],
      updatedAt: now,
    }
  })
}

// ── Generic builders used by the live app (new chapters / new books) ────────

let counter = 0
function uid(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

/** Sections generated from a template — empty titles, grayed placeholders. */
export function sectionsFromTemplate(
  chapterId: string,
  template: ChapterTemplate,
  now: number,
): Section[] {
  return template.parts.map((part, i) => ({
    id: uid('sec'),
    chapterId,
    label: part.label,
    title: '',
    placeholder: part.placeholder,
    body: '',
    status: 'not-started' as Status,
    order: i + 1,
    templatePartId: part.id,
    sources: [],
    citations: [],
    updatedAt: now,
  }))
}

/** A fresh chapter. With a template → its parts as empty sections; else one
 *  blank freeform section ready to write in. */
export function makeChapter(
  number: number,
  now: number,
  template?: ChapterTemplate,
): { chapter: Chapter; sections: Section[] } {
  const id = uid('ch')
  const chapter: Chapter = {
    id,
    number,
    title: '',
    tagline: '',
    status: 'not-started',
    order: number,
    templateId: template?.id ?? null,
    updatedAt: now,
  }
  const sections = template
    ? sectionsFromTemplate(id, template, now)
    : [
        {
          id: uid('sec'),
          chapterId: id,
          label: '',
          title: '',
          placeholder: 'Section title…',
          body: '',
          status: 'not-started' as Status,
          order: 1,
          sources: [],
          citations: [],
          updatedAt: now,
        },
      ]
  return { chapter, sections }
}

export function makeSection(
  chapterId: string,
  order: number,
  now: number,
  kind: 'section' | 'separator' | 'image' = 'section',
): Section {
  return {
    id: uid('sec'),
    chapterId,
    kind,
    label: '',
    title: '',
    placeholder: 'Section title…',
    body: '',
    status: 'not-started',
    order,
    sources: [],
    citations: [],
    updatedAt: now,
  }
}

export function makeTemplate(): ChapterTemplate {
  return {
    id: uid('tpl'),
    name: 'New structure',
    parts: [{ id: uid('p'), label: 'Section', placeholder: 'Write here…' }],
  }
}

export function makeTemplatePart(): TemplatePart {
  return { id: uid('p'), label: 'New part', placeholder: 'Write here…' }
}

export const DEFAULT_VOICE = `Locked default voice: Brené Brown's warmth and intimacy — warm, caring, vulnerable, personal — WITHOUT regional informality (no "y'all"). Layered with Aaron Dignan's systemic, living-systems organisational thinking (sociocracy, holacracy, self-managing organisations, Frederic Laloux).

Guardrails (non-negotiable):
• Never fabricate stories, timelines, details, or motivations.
• Never sequence Giulia's true quotes into a narrative she did not tell.
• No gap-filling — keep her exact words; don't invent specifics.
• The reader (the host) is the hero, not Giulia. "I" is the guide's voice, not invented autobiography.
• Only three story sources: Giulia's own (confirmed), hosts she's worked with (confirmed), or approved external authors.
• Source-first, draft-second. When in doubt, ask — don't fabricate.`

export function defaultSettings(): Settings {
  return {
    theme: 'light',
    accent: '#8B5A3C',
    readingFont: 'Georgia, serif',
    toneOfVoice: DEFAULT_VOICE,
    grammarlyEnabled: false,
    brain: { name: 'BIG TRIBE BRAIN', endpoint: '', connected: false },
  }
}

function seedReferences(): Reference[] {
  return [
    { id: 'ref-godin-tribes', author: 'Seth Godin', work: 'Tribes', idea: 'People want to belong and be led; a tribe needs a leader and a shared idea.', phrasing: 'Seth Godin explains it brilliantly in Tribes when he says…', citingChapters: [] },
    { id: 'ref-dignan-bnw', author: 'Aaron Dignan', work: 'Brave New Work', idea: 'Organisations are living systems, not machines — design for self-management.', phrasing: 'As Aaron Dignan reminds us in Brave New Work…', citingChapters: [] },
    { id: 'ref-brown', author: 'Brené Brown', work: 'Atlas of the Heart', idea: 'True belonging requires vulnerability and showing up as your real self.', phrasing: 'Brené Brown puts it tenderly…', citingChapters: [] },
    { id: 'ref-laloux', author: 'Frederic Laloux', work: 'Reinventing Organizations', idea: 'Self-managing, purpose-driven organisations (Teal) as a model for community.', phrasing: 'Frederic Laloux describes organisations that…', citingChapters: [] },
  ]
}

export const BTB_ABOUT: Record<string, string> = {
  premise: 'A warm, practical guide to building an online community slowly and well.',
  bigIdea: 'Community building is inherently slow — like slow cooking or slow living — and it compounds. The biggest hurdle hosts face is expecting immediate results. Patience over strategy.',
  before: 'A host who is overwhelmed, comparing themselves to others, and expecting fast growth.',
  after: 'A host who trusts the slow path, leads from belonging, and builds something that lasts.',
  relationship: 'The “mama bear” guide — the reader (the host) is the hero.',
  tone: 'Warm, caring, intimate (Brené Brown) layered with systemic, living-systems thinking (Aaron Dignan). No regional informality — no “y’all”.',
  throughline: 'Slow cooking / slow living — community compounds over time.',
  launch: 'Amazon KDP, Labor Day 2026 (Sept 7); aiming for ~50 concentrated positive reviews.',
  goal: 'Bestseller status and a book Giulia can fully stand behind.',
}

/** The Big Tribe Builders book. */
function btbBook(now: number): Book {
  const template = btbTemplate()
  const chapters: Chapter[] = []
  const sections: Section[] = []
  for (const c of CHAPTERS) {
    const chapterId = `ch-${String(c.number).padStart(2, '0')}`
    chapters.push({
      id: chapterId,
      number: c.number,
      title: c.title,
      tagline: c.tagline,
      status: c.status,
      order: c.number,
      templateId: BTB_TEMPLATE_ID,
      updatedAt: now,
    })
    sections.push(...btbSectionsForChapter(chapterId, c.topic, c.title, sectionStatusesFor(c.status), now))
  }
  return {
    id: 'book-btb',
    title: 'Big Tribe Builders',
    author: 'Giulia',
    theme: 'Community building for hosts & leaders — patience over strategy.',
    status: 'writing',
    houseStyle: { bodyFont: 'Georgia, serif', accent: '#8B5A3C', lineHeight: 1.65 },
    settings: defaultSettings(),
    references: seedReferences(),
    templates: [template],
    chapters,
    sections,
    about: { ...BTB_ABOUT },
    resources: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** A brand-new empty book with one starter structure and one blank chapter. */
export function makeBook(title: string, author: string, now: number): Book {
  const starter: ChapterTemplate = {
    id: uid('tpl'),
    name: 'Standard chapter',
    parts: [
      { id: uid('p'), label: 'Opening', placeholder: 'Set the scene…' },
      { id: uid('p'), label: 'Body', placeholder: 'The heart of the chapter…' },
      { id: uid('p'), label: 'Close', placeholder: 'Land the point…' },
    ],
  }
  const { chapter, sections } = makeChapter(1, now)
  return {
    id: uid('book'),
    title: title || 'Untitled Book',
    author,
    theme: '',
    status: 'idea',
    houseStyle: { bodyFont: 'Georgia, serif', accent: '#8B5A3C', lineHeight: 1.65 },
    settings: defaultSettings(),
    references: [],
    templates: [starter],
    chapters: [chapter],
    sections,
    about: {},
    resources: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function buildWorkspace(now: number): WorkspaceState {
  const book = btbBook(now)
  return { books: [book], currentBookId: book.id, studioName: 'Writing Studio', studioOwner: 'Giulia May' }
}
