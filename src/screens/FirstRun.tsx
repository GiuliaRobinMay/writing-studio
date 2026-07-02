import { useState } from 'react'
import { useBookStore } from '../store/useBookStore'

/** Minimal shape we need from the Clerk user — avoids a hard type dependency. */
interface AuthUser {
  id: string
  firstName?: string | null
  fullName?: string | null
}

/**
 * First-run onboarding for a brand-new account. A few small questions, then it
 * seeds the Settings basics and puts one empty book on the shelf, and drops the
 * writer into it. Runs once per account (gated in AuthGate).
 */
export function FirstRun({ user, onDone }: { user: AuthUser; onDone: () => void }) {
  const startFresh = useBookStore((s) => s.startFreshWorkspace)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(user.firstName || user.fullName || '')
  const [title, setTitle] = useState('')
  const [tone, setTone] = useState('')

  const finish = () => {
    startFresh({ owner: name.trim() || 'Writer', bookTitle: title.trim(), tone })
    try {
      localStorage.setItem(`btb-plan:${user.id}`, 'beta') // free during the testing period
    } catch {
      /* ignore */
    }
    location.hash = '#/overview' // land inside the new book, ready to write
    onDone()
  }

  const steps = [
    {
      title: 'Welcome to your Writing Studio',
      hint: 'A couple of quick questions and you’re in.',
      body: (
        <label className="fr-field">
          <span>What should we call you?</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
      ),
    },
    {
      title: 'What are you writing?',
      hint: 'Just a working title — you can change it anytime.',
      body: (
        <label className="fr-field">
          <span>Book title</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled book" />
        </label>
      ),
    },
    {
      title: 'Your voice',
      hint: 'How should your writing feel? (optional — you can set this later in Settings.)',
      body: (
        <label className="fr-field">
          <span>Tone of voice</span>
          <textarea
            autoFocus
            rows={3}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g. warm and direct, honest, a little playful…"
          />
        </label>
      ),
    },
  ]

  const last = step === steps.length - 1
  const s = steps[step]

  return (
    <main className="auth-screen">
      <div className="auth-brand">✦ Writing Studio</div>
      <div className="firstrun-card">
        <div className="fr-dots">
          {steps.map((_, i) => (
            <span key={i} className={`fr-dot${i === step ? ' on' : ''}`} />
          ))}
        </div>
        <h1 className="fr-title">{s.title}</h1>
        <p className="fr-hint">{s.hint}</p>
        {s.body}
        <div className="fr-actions">
          {step > 0 ? (
            <button className="btn ghost" onClick={() => setStep((n) => n - 1)}>← Back</button>
          ) : (
            <span />
          )}
          {last ? (
            <button className="btn primary" onClick={finish}>Enter my studio →</button>
          ) : (
            <button className="btn primary" onClick={() => setStep((n) => n + 1)}>Next →</button>
          )}
        </div>
      </div>
    </main>
  )
}
