import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentBook, useBookStore } from '../store/useBookStore'

interface WizField {
  key: string
  label: string
  placeholder: string
  scope: 'book' | 'about'
  long?: boolean
}
interface WizStep {
  title: string
  blurb: string
  fields: WizField[]
}

// A short, mostly-optional intake — the high-signal Foundation questions.
const STEPS: WizStep[] = [
  {
    title: 'Let’s set up your book',
    blurb: 'A few quick questions to get you started. Skip anything you’re unsure of — you can fill it all in later under Foundation.',
    fields: [
      { key: 'title', label: 'Working title', placeholder: 'What’s the book called?', scope: 'book' },
      { key: 'author', label: 'Author', placeholder: 'Your name', scope: 'book' },
      { key: 'premise', label: 'In one sentence, what is it about?', placeholder: 'The book in a line…', scope: 'about', long: true },
    ],
  },
  {
    title: 'Who is it for?',
    blurb: 'The reader is the hero of every page — the clearer they are, the better everything else gets.',
    fields: [
      { key: 'readerWho', label: 'Who exactly is the reader?', placeholder: 'Their role, their situation…', scope: 'about' },
      { key: 'promise', label: 'What will they walk away with?', placeholder: 'The promise — what they’ll do, feel, or understand.', scope: 'about', long: true },
    ],
  },
  {
    title: 'The heart of it',
    blurb: 'The big idea, and the thread that ties the whole book together.',
    fields: [
      { key: 'bigIdea', label: 'The big idea you’re really arguing', placeholder: 'Your thesis…', scope: 'about', long: true },
      { key: 'throughline', label: 'A core metaphor or throughline', placeholder: 'e.g. slow cooking, a journey… (optional)', scope: 'about' },
    ],
  },
  {
    title: 'Your voice',
    blurb: 'How the book sounds, and how you show up in it.',
    fields: [
      { key: 'relationship', label: 'Your relationship to the reader', placeholder: 'Mentor, peer, guide…', scope: 'about' },
      { key: 'tone', label: 'Tone', placeholder: 'Warm ↔ direct, playful ↔ serious…', scope: 'about' },
    ],
  },
]

export function Onboarding() {
  const navigate = useNavigate()
  const book = useBookStore((s) => currentBook(s))
  const updateBook = useBookStore((s) => s.updateBook)
  const updateAbout = useBookStore((s) => s.updateAbout)
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const last = step === STEPS.length - 1
  const finish = () => navigate('/overview')

  function valueOf(f: WizField): string {
    if (f.scope === 'book') return f.key === 'author' ? book.author : book.title
    return book.about[f.key] ?? ''
  }
  function setValue(f: WizField, v: string) {
    if (f.scope === 'book') updateBook({ [f.key]: v })
    else updateAbout(f.key, v)
  }

  return (
    <main className="onboarding">
      <div className="onb-card">
        <button className="onb-skip" onClick={finish}>
          Skip for now →
        </button>

        <div className="onb-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </div>

        <h1 className="onb-title">{current.title}</h1>
        <p className="onb-blurb">{current.blurb}</p>

        <div className="onb-fields">
          {current.fields.map((f) => (
            <label className="field" key={f.key}>
              <span>{f.label}</span>
              {f.long ? (
                <textarea rows={2} value={valueOf(f)} placeholder={f.placeholder} onChange={(e) => setValue(f, e.target.value)} autoFocus={f === current.fields[0]} />
              ) : (
                <input value={valueOf(f)} placeholder={f.placeholder} onChange={(e) => setValue(f, e.target.value)} autoFocus={f === current.fields[0]} />
              )}
            </label>
          ))}
        </div>

        <div className="onb-nav">
          {step > 0 ? (
            <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          {last ? (
            <button className="btn primary" onClick={finish}>
              Start writing →
            </button>
          ) : (
            <button className="btn primary" onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
