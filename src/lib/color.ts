// Tiny colour helpers so a single chosen accent hex can drive the whole
// warm-brown palette (soft + translucent wash variants).

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full || '8B5A3C', 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mix a hex colour toward a target rgb by amount 0..1. */
export function mix(hex: string, target: [number, number, number], amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  const m = (a: number, t: number) => Math.round(a + (t - a) * amt)
  return `rgb(${m(r, target[0])}, ${m(g, target[1])}, ${m(b, target[2])})`
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
