// ───────────────────────────────────────────────────────────────────────────
// Pagination engine for reader mode. We flatten the book into ordered blocks,
// measure each block's real rendered height in the browser, then greedily pack
// blocks into fixed-height pages — so the page count is genuine, not estimated.
// ───────────────────────────────────────────────────────────────────────────

export type Block =
  | { kind: 'chapter-title'; chapterId: string; number: number; title: string; tagline: string }
  | { kind: 'section-title'; title: string }
  | { kind: 'html'; html: string }
  | { kind: 'separator' }
  | { kind: 'image'; src: string; caption: string }

export interface Page {
  /** 1-based page number across the whole book. */
  number: number
  /** Running-head chapter title for this page. */
  runningHead: string
  blocks: Block[]
}

// A block index per page, after packing.
export interface PackInput {
  heights: number[]
  /** true → block should not be left orphaned at the bottom (e.g. headings). */
  keepWithNext: boolean[]
  /** true → force a page break *before* this block (chapter openers). */
  breakBefore: boolean[]
  pageHeight: number
}

/** Pure packing: returns arrays of block indices, one per page. */
export function packPages({ heights, keepWithNext, breakBefore, pageHeight }: PackInput): number[][] {
  const pages: number[][] = []
  let current: number[] = []
  let used = 0

  const flush = () => {
    if (current.length) pages.push(current)
    current = []
    used = 0
  }

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i]

    if (breakBefore[i] && current.length) flush()

    // A heading that would sit at the very bottom should move with its body.
    const lookahead = keepWithNext[i] && i + 1 < heights.length ? heights[i + 1] : 0

    if (current.length && used + h + lookahead > pageHeight) flush()

    // A single block taller than a page still occupies its own page.
    current.push(i)
    used += h
  }
  flush()
  return pages
}

/** Flatten an HTML string into its top-level element blocks. */
export function htmlToBlocks(html: string): Block[] {
  if (!html.trim()) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.body.children).map((el) => ({ kind: 'html', html: el.outerHTML }) as Block)
}
