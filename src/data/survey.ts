// The book Foundation survey — the context layer every AI feature will read
// from. Answers are stored per book in `book.about`, keyed by question id.

export interface SurveyQuestion {
  id: string
  label: string
  placeholder: string
  long?: boolean
}

export interface SurveyGroup {
  title: string
  blurb: string
  questions: SurveyQuestion[]
}

export const SURVEY: SurveyGroup[] = [
  {
    title: 'The spine',
    blurb: 'What the book is, in its bones.',
    questions: [
      { id: 'premise', label: 'The book in one sentence', placeholder: 'What is this book about?' },
      { id: 'bigIdea', label: 'The big idea / thesis', placeholder: 'What are you really arguing?', long: true },
      { id: 'before', label: 'The reader at the start', placeholder: 'Where are they when they pick it up?' },
      { id: 'after', label: 'The reader at the end', placeholder: 'Where are they once they finish?' },
      { id: 'promise', label: 'The promise', placeholder: 'What will they be able to do, feel, or understand?', long: true },
      { id: 'whyYou', label: 'Why this book, why you', placeholder: 'Your authority / origin for writing it.', long: true },
    ],
  },
  {
    title: 'The reader',
    blurb: 'The hero of every paragraph.',
    questions: [
      { id: 'readerWho', label: 'Who exactly is the reader?', placeholder: 'Role, situation…' },
      { id: 'readerStage', label: 'Where are they in their journey?', placeholder: 'Beginner, stuck, experienced…' },
      { id: 'readerPain', label: 'What keeps them up at night?', placeholder: 'The problem they feel.', long: true },
      { id: 'readerTried', label: 'What have they already tried that failed?', placeholder: '', long: true },
      { id: 'readerBelief', label: 'What belief will you challenge?', placeholder: 'The misconception you’ll shift.', long: true },
    ],
  },
  {
    title: 'Voice & presence',
    blurb: 'How it sounds, and how present you are.',
    questions: [
      { id: 'relationship', label: 'Your relationship to the reader', placeholder: 'Mentor, peer, guide… (yours: “mama bear”)' },
      { id: 'tone', label: 'Tone', placeholder: 'Warm ↔ direct, playful ↔ serious, plain ↔ lyrical…' },
      { id: 'voiceModels', label: 'Voice inspirations', placeholder: 'Authors whose voice you admire.' },
      { id: 'wordsLoveBan', label: 'Words you love / banned words', placeholder: 'e.g. no “y’all”' },
      { id: 'authorPresence', label: 'When do you step in yourself?', placeholder: 'Origin story, vulnerability, opinion…', long: true },
    ],
  },
  {
    title: 'Story & throughline',
    blurb: 'The thread that runs through everything.',
    questions: [
      { id: 'throughline', label: 'The core metaphor / throughline', placeholder: 'e.g. slow cooking, slow living' },
      { id: 'motifs', label: 'Recurring motifs or frameworks', placeholder: '', long: true },
      { id: 'signatureIP', label: 'Signature concepts that are YOUR IP', placeholder: 'Terms / models only you use.', long: true },
      { id: 'offLimits', label: 'What’s off-limits / private', placeholder: '' },
    ],
  },
  {
    title: 'Goal & market',
    blurb: 'What success looks like.',
    questions: [
      { id: 'goal', label: 'The real goal', placeholder: 'Bestseller, lead-gen, credibility, legacy…' },
      { id: 'comps', label: 'Comparable titles — and how you differ', placeholder: '', long: true },
      { id: 'publishing', label: 'Publishing path & formats', placeholder: 'KDP / trad · print / ebook / audio' },
      { id: 'launch', label: 'Launch target / deadline', placeholder: 'e.g. KDP, Labor Day 2026' },
    ],
  },
]

// Flat list of ids, for completeness math.
export const SURVEY_IDS = SURVEY.flatMap((g) => g.questions.map((q) => q.id))
