export interface GrowMetric {
  id: string
  label: string
  hint: string
}

export interface GrowItem {
  id: string
  label: string
  hint?: string
}

export interface GrowWave {
  key: string
  title: string
  blurb: string
  items: GrowItem[]
}

// The numbers worth watching (from the plan — track the trend, not the hourly rank).
export const GROW_METRICS: GrowMetric[] = [
  { id: 'email', label: 'Email subscribers', hint: 'The highest-converting channel — grow it every week.' },
  { id: 'reviews', label: 'Amazon reviews', hint: '50+ unlocks the algorithm; keep climbing toward 250+.' },
  { id: 'sales', label: 'Copies sold', hint: 'Watch the trend, not the hourly rank.' },
  { id: 'podcasts', label: 'Podcasts released', hint: 'A sustained tour — aim for 45+ across six months.' },
  { id: 'badges', label: 'Bestseller badges held', hint: 'Category × country.' },
]

// The six-month tour — most books peak at launch; this keeps yours selling.
export const GROW_WAVES: GrowWave[] = [
  {
    key: 'm1',
    title: 'Reviews drive',
    blurb: 'Month 1 — turn early readers into reviews.',
    items: [
      { id: 'g1-arc', label: 'Nudge every ARC reader who hasn’t reviewed yet', hint: 'One warm, personal message each.' },
      { id: 'g1-quotes', label: 'Roll review quotes into weekly content' },
      { id: 'g1-live', label: 'One live with a friend — cook/read/talk together', hint: 'Lives are favoured right after a launch.' },
    ],
  },
  {
    key: 'm2',
    title: 'Podcast wave & features',
    blurb: 'Month 2 — now you can lead with the bestseller badge.',
    items: [
      { id: 'g2-outreach', label: 'Second podcast outreach round — bigger shows' },
      { id: 'g2-feature', label: 'Pitch one major publication or feature' },
      { id: 'g2-back', label: 'Softly open the conversation about your next offer' },
    ],
  },
  {
    key: 'm3',
    title: 'Book clubs & a live event',
    blurb: 'Month 3 — go where readers already gather.',
    items: [
      { id: 'g3-clubs', label: 'Reach out to reading/interest clubs — offer a Q&A' },
      { id: 'g3-event', label: 'Host one live event — a reading + a gathering' },
      { id: 'g3-press', label: 'Local & niche press around the event' },
    ],
  },
  {
    key: 'm4',
    title: 'The gift window',
    blurb: 'Month 4 — the single biggest sales month of the year.',
    items: [
      { id: 'g4-gift', label: 'Reframe the book as a gift — a whole month of it' },
      { id: 'g4-bundle', label: 'A signed copy / bundle on your own store' },
      { id: 'g4-deal', label: 'A promo push (BookBub / deal newsletters)', hint: 'Brings fresh readers who upgrade to print.' },
    ],
  },
  {
    key: 'm5',
    title: 'Year-end lists',
    blurb: 'Month 5 — visibility, then real rest.',
    items: [
      { id: 'g5-lists', label: 'Pitch “best books of the year” round-ups — early', hint: 'Before the lists lock, first week of the month.' },
      { id: 'g5-news', label: 'One generous year-end newsletter' },
      { id: 'g5-rest', label: 'Rest — let the book do the work' },
    ],
  },
  {
    key: 'm6',
    title: 'New year & the segue',
    blurb: 'Month 6 — a last push, then open what’s next.',
    items: [
      { id: 'g6-push', label: '“Begin the year with this” campaign' },
      { id: 'g6-retro', label: 'The retrospective — your most honest, generous piece' },
      { id: 'g6-next', label: 'Open the next thing (your course / retreat / offer)' },
    ],
  },
]

export const GROW_ITEM_COUNT = GROW_WAVES.reduce((n, w) => n + w.items.length, 0)
