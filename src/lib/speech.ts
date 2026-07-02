// Read-aloud via the browser's built-in speech synthesis (free, offline, no API).
// Text is spoken sentence-by-sentence so pause/stop stay responsive and we dodge
// Chrome's ~15s single-utterance cutoff.

export type SpeechState = 'idle' | 'playing' | 'paused'

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Split prose into speakable chunks (sentences), keeping them short. */
export function toChunks(paragraphs: string[]): string[] {
  const out: string[] = []
  for (const p of paragraphs) {
    const t = p.trim()
    if (!t) continue
    const sentences = t.match(/[^.!?]+[.!?]*\s*/g) || [t]
    for (const s of sentences) {
      const chunk = s.trim()
      if (chunk) out.push(chunk)
    }
  }
  return out
}

export class SpeechReader {
  private queue: string[] = []
  private i = 0
  private rate = 1
  private state: SpeechState = 'idle'
  private keepAlive: number | undefined
  onState?: (s: SpeechState) => void

  private set(s: SpeechState) {
    this.state = s
    this.onState?.(s)
    if (s === 'playing') this.startKeepAlive()
    else this.stopKeepAlive()
  }

  // Chrome silently pauses long sessions — nudging resume() keeps it going.
  private startKeepAlive() {
    this.stopKeepAlive()
    this.keepAlive = window.setInterval(() => {
      if (this.state === 'playing') window.speechSynthesis.resume()
    }, 9000)
  }
  private stopKeepAlive() {
    if (this.keepAlive) window.clearInterval(this.keepAlive)
    this.keepAlive = undefined
  }

  play(chunks: string[], rate = 1) {
    if (!speechSupported()) return
    this.stop()
    this.queue = chunks.filter((c) => c.trim())
    this.i = 0
    this.rate = rate
    if (!this.queue.length) return
    this.set('playing')
    this.next()
  }

  private next() {
    if (this.state === 'idle') return
    if (this.i >= this.queue.length) {
      this.set('idle')
      return
    }
    const u = new SpeechSynthesisUtterance(this.queue[this.i])
    u.rate = this.rate
    u.onend = () => {
      if (this.state === 'idle') return
      this.i += 1
      this.next()
    }
    u.onerror = () => {
      if (this.state === 'idle') return
      this.i += 1
      this.next()
    }
    window.speechSynthesis.speak(u)
  }

  pause() {
    if (this.state === 'playing') {
      window.speechSynthesis.pause()
      this.set('paused')
    }
  }
  resume() {
    if (this.state === 'paused') {
      window.speechSynthesis.resume()
      this.set('playing')
    }
  }
  stop() {
    this.i = 0
    this.queue = []
    if (speechSupported()) window.speechSynthesis.cancel()
    this.set('idle')
  }
}
