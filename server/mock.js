// Mock BIG TRIBE BRAIN fixtures — verbatim-style chunks with provenance, so the
// source-first retrieval flow is fully testable before the real BigQuery brain
// is connected. These imitate Giulia's transcripts/articles.

const CHUNKS = [
  {
    id: 'mock-1',
    name: 'Belonging is built, not announced',
    text: 'You can’t tell people they belong and expect them to feel it. Belonging is something they conclude on their own, slowly, from a hundred small moments where they felt seen. My job as a host is to engineer those moments, not to declare the outcome.',
    source: 'Transcript — "Belonging" workshop, Mar 2024',
    mentionCount: 14,
  },
  {
    id: 'mock-2',
    name: 'One true fan a day',
    text: 'In the first months I told myself: win one true fan a day. Not a follower — a fan. Someone who would tell a friend. If I did that for a year, I’d have 365 people who actually cared, and that beats ten thousand who don’t.',
    source: 'Voice note — early growth reflections',
    mentionCount: 9,
  },
  {
    id: 'mock-3',
    name: 'Community building is slow cooking',
    text: 'I keep coming back to slow cooking. You cannot rush it with more heat — you only ruin it. Community compounds the same way. The hosts who burn out are the ones who expected a microwave and got a casserole.',
    source: 'Medium article — "The Slow Community"',
    mentionCount: 21,
  },
  {
    id: 'mock-4',
    name: 'Rituals carry the culture when you can’t be everywhere',
    text: 'Once you pass a few hundred members you simply cannot greet everyone. So the welcome has to live in a ritual — something that happens every week whether you’re there or not. The ritual becomes the host when the host can’t be.',
    source: 'Transcript — "Rituals" lesson',
    mentionCount: 11,
  },
  {
    id: 'mock-5',
    name: 'The host is the mood maker',
    text: 'Whatever energy I bring on Monday is the weather for the whole week. If I’m anxious about numbers, the community feels it. If I’m warm and patient, that spreads too. You model the behaviour you want to see.',
    source: 'Transcript — "Culture" call, Jan 2024',
    mentionCount: 7,
  },
]

export function mockSearch(query, topK = 5) {
  const q = (query || '').toLowerCase()
  const scored = CHUNKS.map((c) => {
    const hay = (c.name + ' ' + c.text).toLowerCase()
    const hits = q.split(/\s+/).filter((w) => w && hay.includes(w)).length
    // Fake a cosine-ish distance: more keyword hits → smaller distance.
    const distance = Math.max(0.05, 0.6 - hits * 0.12)
    return { ...c, distance }
  })
  return scored.sort((a, b) => a.distance - b.distance).slice(0, topK)
}
