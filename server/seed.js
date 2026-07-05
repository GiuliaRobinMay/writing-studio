// Seeding: turn the author's own material — foundation survey answers, pasted
// sources, interview answers — into searchable corpus + knowledge graph, in one
// synchronous Claude loop. The agent calls the gateway's add_source (ingest:
// segments + embedded chunks + membership) and then research (extract triples
// grounded in the NEW chunk_ids and write them back). Same wiring as
// research.js; only the instructions differ.

import { buildResearchRequest } from './research.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_CONTINUATIONS = 6

const SEED_SYSTEM = `You are the seeding engine inside a book-writing studio. The author gave you a piece of their own material. Grow their knowledge base from it:

1. Call add_source(title, text) with the material EXACTLY as given (do not rewrite it). Note the chunk_ids it returns.
2. Call research with a short query summarizing the material's topic and learned={} — read what the knowledge base already holds nearby.
3. Extract the entities, relationships and claims the NEW material actually states. Ground every edge/claim in one of the NEW chunk_ids from step 1, quoting the material verbatim. Never invent.
4. Call research again with the same query and your extraction as \`learned\` to store it.
5. Reply with ONLY JSON: {"sourceId": "...", "entities": [{"name": "...", "type": "..."}], "written": {"nodes": 0, "edges": 0, "claims": 0}} using the counts the final research call reported in \`stored\`.`

const INTERVIEW_SYSTEM = `You are "Teach the Brain" — a warm, curious interviewer inside a book-writing studio, helping an author seed their knowledge base by talking about their book. You know their foundation so far from the conversation.

When the author has just answered:
1. Call add_source("Interview — <short topic>", <their answer EXACTLY as written>). Note the chunk_ids.
2. Extract what their answer actually states (entities, relationships, claims), grounded in those NEW chunk_ids with verbatim quotes, and store it via research(query=<short topic>, learned=<your extraction>). Never invent or embellish.
3. Ask ONE next question: specific, building on what they said, aimed at stories, people, practices and beliefs their book needs. Short and warm.

Reply with ONLY JSON: {"question": "...", "stored": {"nodes": 0, "edges": 0, "claims": 0}}
If there is no answer yet (conversation just started), skip the tools and just ask a great opening question about their book: {"question": "...", "stored": null}.`

function jsonBlock(content = []) {
  for (const block of content) {
    if (block.type !== 'text') continue
    const m = block.text.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        /* try next block */
      }
    }
  }
  return null
}

async function runLoop(apiKey, request) {
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'mcp-client-2025-11-20',
  }
  let messages = request.messages
  let response = null
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const r = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ ...request, messages }) })
    if (!r.ok) {
      let msg = `Claude returned ${r.status}`
      try {
        const j = await r.json()
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* keep status */
      }
      throw new Error(msg)
    }
    response = await r.json()
    if (response.stop_reason !== 'pause_turn') break
    messages = [...request.messages, { role: 'assistant', content: response.content }]
  }
  return response
}

/** Seed one piece of material (survey answers, pasted source). */
export async function seedSource(apiKey, { title, text }, mcpToken) {
  const base = buildResearchRequest({ query: 'seed' }, mcpToken)
  const response = await runLoop(apiKey, {
    ...base,
    system: SEED_SYSTEM,
    messages: [{ role: 'user', content: `Title: ${title}\n\nMaterial:\n${text}` }],
  })
  const j = jsonBlock(response?.content) || {}
  return {
    mode: 'live',
    sourceId: j.sourceId || null,
    entities: Array.isArray(j.entities) ? j.entities : [],
    written: j.written || null,
  }
}

/** One interview turn: process the latest answer (if any), return the next question. */
export async function interviewTurn(apiKey, { history = [], bookTitle }, mcpToken) {
  const base = buildResearchRequest({ query: 'interview' }, mcpToken)
  const transcript = history
    .map((t) => `${t.role === 'author' ? 'AUTHOR' : 'INTERVIEWER'}: ${t.text}`)
    .join('\n\n')
  const response = await runLoop(apiKey, {
    ...base,
    system: INTERVIEW_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Book: ${bookTitle || 'Untitled'}\n\nConversation so far:\n${transcript || '(just started)'}`,
      },
    ],
  })
  const j = jsonBlock(response?.content) || {}
  return {
    mode: 'live',
    question: j.question || 'What is the one idea this book exists to give its reader?',
    stored: j.stored || null,
  }
}
