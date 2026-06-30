// Plain-text + word-count helpers. Bodies are stored as HTML (TipTap),
// so we strip tags before counting.

export function htmlToText(html: string): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/ /g, ' ')
}

/** True when HTML has no real text (covers '', '<p></p>', whitespace, &nbsp;). */
export function isHtmlEmpty(html: string): boolean {
  if (!html) return true
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, '').length === 0
}

export function countWords(html: string): number {
  const text = htmlToText(html).trim()
  if (!text) return 0
  return text.split(/\s+/).length
}

/** Roughly 280 typeset words per A-series reader page; used only as a hint —
 *  the real page count comes from the paginator in reader mode. */
export function estimatePages(words: number): number {
  return Math.max(1, Math.round(words / 280))
}
