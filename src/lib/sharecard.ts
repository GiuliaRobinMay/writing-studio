import { mix, rgba } from './color'

// Renders a "Show your work" share card straight onto a <canvas>, so the same
// canvas is both the live preview and the exported PNG — no library, always
// pixel-identical. Themed from the book's accent so each card matches its cover.

export type ShareFormat = 'portrait' | 'square'

export interface ShareCardOpts {
  quote: string
  author: string
  bookTitle: string
  label: string
  accent: string
  format: ShareFormat
}

const SIZES: Record<ShareFormat, [number, number]> = {
  portrait: [1080, 1350],
  square: [1080, 1080],
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (line && ctx.measureText(test).width > maxW) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    lines.push(line)
  }
  return lines
}

export function drawShareCard(canvas: HTMLCanvasElement, o: ShareCardOpts): void {
  const [W, H] = SIZES[o.format]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const accent = o.accent || '#8B5A3C'
  const bg = mix(accent, [255, 255, 255], 0.92)
  const ink = mix(accent, [0, 0, 0], 0.6)
  const labelC = mix(accent, [0, 0, 0], 0.1)
  const authorC = mix(accent, [0, 0, 0], 0.32)
  const footerBg = mix(accent, [0, 0, 0], 0.18)
  const footerText = mix(accent, [255, 255, 255], 0.9)

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = rgba(accent, 0.3)
  ctx.lineWidth = 3
  ctx.strokeRect(44, 44, W - 88, H - 88)

  const pad = 96
  const footerH = 128
  const contentBottom = H - footerH

  // Label (top)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = labelC
  ctx.font = '600 30px Georgia, serif'
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '5px'
  const label = `${o.label.toUpperCase()}${o.bookTitle ? `   ·   ${o.bookTitle.toUpperCase()}` : ''}`
  ctx.fillText(label, pad, pad + 40)
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'

  // Quote (auto-fit)
  const maxW = W - pad * 2
  const quoteTop = pad + 110
  const quoteArea = contentBottom - quoteTop - 96
  let size = o.format === 'portrait' ? 62 : 54
  let lines: string[] = []
  let lineH = 0
  for (; size >= 28; size -= 2) {
    ctx.font = `400 ${size}px Georgia, serif`
    lines = wrapLines(ctx, o.quote.trim() || '…', maxW)
    lineH = size * 1.42
    if (lines.length * lineH <= quoteArea) break
  }
  ctx.fillStyle = ink
  ctx.font = `400 ${size}px Georgia, serif`
  let y = quoteTop + lineH
  for (const ln of lines) {
    ctx.fillText(ln, pad, y)
    y += lineH
  }

  // Author
  ctx.fillStyle = authorC
  ctx.font = 'italic 34px Georgia, serif'
  ctx.fillText(`— ${o.author || 'You'}`, pad, y + 20)

  // Footer strip — the quiet growth loop
  ctx.fillStyle = footerBg
  ctx.fillRect(0, H - footerH, W, footerH)
  ctx.fillStyle = footerText
  ctx.font = '500 30px Georgia, serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('✦   Made in Writing Studio', pad, H - footerH / 2)
  ctx.textBaseline = 'alphabetic'
}
