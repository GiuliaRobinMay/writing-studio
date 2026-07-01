import type { PublishMeta } from '../types'

export interface PublishItem {
  id: string
  label: string
  hint?: string
  /** An inline action: 'export' opens the Reader (where Word/PDF export lives). */
  action?: 'export'
}

export interface PublishStage {
  key: string
  title: string
  blurb: string
  items: PublishItem[]
}

// The four stages of a self-publish, from finished manuscript to launch week.
export const PUBLISH_STAGES: PublishStage[] = [
  {
    key: 'manuscript',
    title: 'Manuscript-ready',
    blurb: 'The book, finished and exportable.',
    items: [
      { id: 'm-written', label: 'All chapters written & self-edited' },
      { id: 'm-proofed', label: 'Proofread', hint: 'Send the Word export to a proofreader — they comment in Word/Docs, you bring it back.', action: 'export' },
      { id: 'm-front', label: 'Front matter added', hint: 'Title page, copyright, dedication, table of contents.' },
      { id: 'm-back', label: 'Back matter added', hint: 'About the author, also-by, a call to action toward your other work.' },
      { id: 'm-files', label: 'Manuscript files exported', hint: 'DOCX or EPUB for Kindle; a print-ready PDF for paperback/hardcover.', action: 'export' },
    ],
  },
  {
    key: 'package',
    title: 'Cover & metadata',
    blurb: 'How the book shows up on the shelf.',
    items: [
      { id: 'p-cover', label: 'Cover designed', hint: 'Ebook front image; a full-wrap PDF (back + spine + front) for print — spine text needs ≥ 79 pages.' },
      { id: 'p-desc', label: 'Book description written', hint: 'Your listing sales copy — hook in the first line.' },
      { id: 'p-keywords', label: '7 keywords chosen', hint: 'Search phrases a reader would actually type.' },
      { id: 'p-cats', label: 'Categories chosen', hint: '2 at upload + up to 8 more by emailing KDP — the single biggest bestseller lever.' },
      { id: 'p-isbn', label: 'ISBN assigned', hint: 'Free from KDP, or bring your own.' },
      { id: 'p-price', label: 'Pricing set', hint: 'Ebook $2.99–$9.99 earns the 70% royalty; outside that band it drops to 35%.' },
    ],
  },
  {
    key: 'prelaunch',
    title: 'Pre-launch sprint',
    blurb: 'The foundations a launch rests on — set up ~7 weeks out.',
    items: [
      { id: 'l-cats', label: 'Winnable niche categories researched', hint: 'Narrow sub-categories where you can realistically take #1.' },
      { id: 'l-arc', label: 'ARC team recruited (80–150 readers)', hint: 'Aim for 50+ reviews in launch week — that’s when Amazon’s algorithm starts pushing the book.' },
      { id: 'l-email', label: 'Email list set up', hint: 'The single highest-converting launch channel.' },
      { id: 'l-platform', label: 'Author platform ready', hint: 'Amazon Author Central, Goodreads Author, BookBub — three free one-time setups.' },
      { id: 'l-preorder', label: 'Pre-order listing open', hint: 'Ebook pre-orders count toward launch-week ranking.' },
      { id: 'l-event', label: 'Launch event planned', hint: 'Turn the launch into a felt moment, not just a transaction.' },
    ],
  },
  {
    key: 'launch',
    title: 'Launch week',
    blurb: 'The concentrated push that wins the badge.',
    items: [
      { id: 'w-emails', label: 'Launch-week emails scheduled' },
      { id: 'w-social', label: 'Social posts scheduled' },
      { id: 'w-arc', label: 'ARC reviewers briefed to post launch week' },
      { id: 'w-podcasts', label: 'Podcast episodes scheduled to drop' },
      { id: 'w-badges', label: 'Badge check — screenshot every #1 for press' },
    ],
  },
]

export const PUBLISH_ITEM_COUNT = PUBLISH_STAGES.reduce((n, s) => n + s.items.length, 0)

export const META_FIELDS: { id: keyof PublishMeta; label: string; hint?: string; long?: boolean }[] = [
  { id: 'subtitle', label: 'Subtitle', hint: 'A searchable, benefit-led subtitle.' },
  { id: 'description', label: 'Book description', hint: 'The listing copy — hook first.', long: true },
  { id: 'keywords', label: 'Keywords (up to 7)', hint: 'One phrase per line.', long: true },
  { id: 'categories', label: 'Categories', hint: 'Two winnable niches; note more via KDP email.', long: true },
  { id: 'isbn', label: 'ISBN' },
  { id: 'trimSize', label: 'Trim size', hint: 'e.g. 6×9 in.' },
  { id: 'ebookPrice', label: 'Ebook price', hint: '$2.99–$9.99 → 70%.' },
  { id: 'launchDate', label: 'Launch date', hint: 'A date with a press hook helps.' },
]
