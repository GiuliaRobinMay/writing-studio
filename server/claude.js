// Claude connection for section drafting. Talks to the Anthropic Messages API
// with a raw fetch (no SDK dependency) so it runs unchanged in the Vercel
// serverless functions and in the local dev server. The API key lives in the
// environment — the browser never sees it.
//
// The system prompt bakes in the book's §5 content-integrity rules. These are
// non-negotiable: the draft is a starting point for the author to redact, and
// it must never fabricate stories, quotes, or facts.

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-4-8'

const INTEGRITY = `NON-NEGOTIABLE INTEGRITY RULES — never break these:
- Never fabricate stories, timelines, details, statistics, or motivations.
- Never invent quotes, and never sequence the author's real quotes into a narrative they did not tell. Invented connectors ("and so", "that's when I…") turn true statements false — this is the worst possible failure.
- No gap-filling. "I made a list" stays "I made a list".
- The reader — a community host — is the hero, not the author. "I" is fine as a guide sharing lived experience, never as invented autobiography.
- Source-first: draw only on the brief and any SOURCE PASSAGES you are given. Where a specific story, quote, name, place, or statistic is needed but was NOT provided, write a clearly bracketed placeholder such as [your story about the first meetup here] — do NOT invent it.`

/** Build the system + user prompt for drafting one section. */
export function buildDraftRequest(payload = {}) {
  const { voice, bookTitle, chapterTitle, sectionLabel, sectionTitle, brief, sources = [], model } = payload
  const voiceLine =
    (voice && voice.trim()) ||
    'Brené Brown warmth and intimacy (no regional informality like "y\'all") layered with Aaron Dignan systemic, living-systems thinking.'

  const system = `You are a drafting assistant for a single-author nonfiction book${bookTitle ? ` titled "${bookTitle}"` : ''}. You write a first draft of ONE section for the author to review and redact — never final copy, always theirs to change.

VOICE — write in this voice throughout: ${voiceLine}

${INTEGRITY}

OUTPUT: 2–5 short paragraphs of clean prose. Plain text only, paragraphs separated by a single blank line. No headings, no markdown, no preamble, no sign-off — return only the drafted passage.`

  const parts = []
  parts.push(`Section to draft: ${sectionTitle || sectionLabel || 'Untitled section'}`)
  if (chapterTitle) parts.push(`Chapter: ${chapterTitle}`)
  parts.push(
    `\nBrief from the author (what this section should cover):\n${
      (brief && brief.trim()) || '(No brief provided — keep it brief and leave bracketed placeholders for the author to fill in.)'
    }`,
  )
  if (sources.length) {
    parts.push(
      `\nSOURCE PASSAGES — the only factual material you may draw on. Use their ideas faithfully; do not add facts or quotes beyond them:\n` +
        sources.map((s, i) => `[${i + 1}] ${s}`).join('\n'),
    )
  } else {
    parts.push(
      `\nNo source passages were provided. Do not invent facts, stories, or quotes — use bracketed placeholders wherever a real specific is needed.`,
    )
  }

  return { model: model || process.env.CLAUDE_MODEL || DEFAULT_MODEL, system, user: parts.join('\n') }
}

/** Call Claude to draft a section. Returns { text, model }. Throws on API error. */
export async function draftSection(apiKey, payload) {
  const { model, system, user } = buildDraftRequest(payload)
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Anthropic ${r.status}: ${body.slice(0, 300)}`)
  }
  const data = await r.json()
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  return { text, model }
}
