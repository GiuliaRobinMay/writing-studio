import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  convertMillimetersToTwip,
} from 'docx'
import type { Book, Chapter, Note, Section } from '../types'
import { chaptersSorted, sectionsOf } from '../store/useBookStore'
import { isHtmlEmpty } from './text'

interface Fmt {
  bold?: boolean
  italics?: boolean
  underline?: boolean
  strike?: boolean
  allCaps?: boolean
}

/** Collect formatted TextRuns from an inline DOM node. */
function runs(node: Node, fmt: Fmt): TextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    if (!text) return []
    return [new TextRun({ text, bold: fmt.bold, italics: fmt.italics, strike: fmt.strike, allCaps: fmt.allCaps, underline: fmt.underline ? { type: UnderlineType.SINGLE } : undefined })]
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return []
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (tag === 'br') return [new TextRun({ text: '', break: 1 })]
  const next: Fmt = { ...fmt }
  if (tag === 'strong' || tag === 'b') next.bold = true
  if (tag === 'em' || tag === 'i') next.italics = true
  if (tag === 'u') next.underline = true
  if (tag === 's' || tag === 'strike' || tag === 'del') next.strike = true
  if (el.hasAttribute('data-uppercase')) next.allCaps = true
  return Array.from(el.childNodes).flatMap((c) => runs(c, next))
}

/** Convert a section body's HTML into docx paragraphs. */
function htmlToParagraphs(html: string): Paragraph[] {
  if (isHtmlEmpty(html)) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: Paragraph[] = []
  for (const node of Array.from(doc.body.children)) {
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') {
      Array.from(el.querySelectorAll(':scope > li')).forEach((li, i) => {
        const r = runs(li, {})
        out.push(
          tag === 'ul'
            ? new Paragraph({ children: r, bullet: { level: 0 } })
            : new Paragraph({ children: [new TextRun({ text: `${i + 1}. ` }), ...r], indent: { left: convertMillimetersToTwip(8) } }),
        )
      })
      continue
    }
    if (tag === 'blockquote') {
      out.push(new Paragraph({ children: runs(el, { italics: true }), indent: { left: convertMillimetersToTwip(10) } }))
      continue
    }
    if (tag === 'h1') { out.push(new Paragraph({ children: runs(el, {}), heading: HeadingLevel.HEADING_3 })); continue }
    if (tag === 'h2') { out.push(new Paragraph({ children: runs(el, {}), heading: HeadingLevel.HEADING_4 })); continue }
    if (tag === 'h3') { out.push(new Paragraph({ children: runs(el, { bold: true }) })); continue }
    out.push(new Paragraph({ children: runs(el, {}) }))
  }
  return out
}

export async function bookToDocxBlob(
  book: Book,
  chapters: Chapter[],
  sections: Section[],
  notes: Note[],
  onlyChapterId?: string,
): Promise<Blob> {
  const chs = chaptersSorted(chapters).filter((c) => !onlyChapterId || c.id === onlyChapterId)
  const children: Paragraph[] = []

  // Title page
  children.push(new Paragraph({ text: book.title || 'Untitled', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 } }))
  if (book.author) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `by ${book.author}`, italics: true })] }))

  for (const ch of chs) {
    const label = `Chapter ${String(ch.number).padStart(2, '0')}${ch.title ? ` — ${ch.title}` : ''}`
    children.push(new Paragraph({ text: label, heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { after: 120 } }))
    if (ch.tagline) children.push(new Paragraph({ children: [new TextRun({ text: ch.tagline, italics: true })], spacing: { after: 240 } }))

    const chSections = sectionsOf(sections, ch.id).filter((s) => !isHtmlEmpty(s.body))
    for (const sec of chSections) {
      if (sec.title.trim()) children.push(new Paragraph({ text: sec.title, heading: HeadingLevel.HEADING_2 }))
      children.push(...htmlToParagraphs(sec.body))
    }

    // Notes & Adaptations — the margin comments for this chapter (house style §6).
    const chapterSectionIds = new Set(sectionsOf(sections, ch.id).map((s) => s.id))
    const chNotes = notes.filter((n) => chapterSectionIds.has(n.sectionId))
    if (chNotes.length) {
      children.push(new Paragraph({ text: 'Notes & Adaptations', heading: HeadingLevel.HEADING_2, spacing: { before: 320 } }))
      for (const n of chNotes) {
        if (n.quote) children.push(new Paragraph({ children: [new TextRun({ text: `“${n.quote}”`, italics: true })], indent: { left: convertMillimetersToTwip(6) } }))
        children.push(new Paragraph({ children: [new TextRun({ text: n.text || '(no note)' })], spacing: { after: 160 } }))
      }
    }
  }

  const doc = new Document({
    creator: book.author || 'Writing Studio',
    title: book.title,
    styles: {
      default: {
        document: {
          run: { font: 'Georgia', size: 24 },
          paragraph: { spacing: { line: 360, after: 160 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: { top: convertMillimetersToTwip(25), bottom: convertMillimetersToTwip(25), left: convertMillimetersToTwip(28), right: convertMillimetersToTwip(28) },
          },
        },
        children,
      },
    ],
  })
  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
