import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import { countWords, isHtmlEmpty } from '../lib/text'
import { StatusSelect } from '../components/StatusChip'
import { SectionWriter } from '../components/SectionEditor'
import { getVoiceNote, setVoiceNote, delVoiceNote, blobToDataUrl } from '../lib/voicenote'
import { claudeHealth, draftSection } from '../lib/claude'
import { EditorBoundary } from '../components/EditorBoundary'

/** Turn Claude's plain-text paragraphs into safe HTML for the editor. */
function draftToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function BriefPanel({ sectionId, onInserted }: { sectionId: string; onInserted?: () => void }) {
  const brief = useBookStore((s) => currentBook(s).sections.find((x) => x.id === sectionId)?.brief ?? '')
  const updateBrief = useBookStore((s) => s.updateSectionBrief)
  const updateBody = useBookStore((s) => s.updateSectionBody)
  const book = useBookStore((s) => currentBook(s))
  const section = book.sections.find((x) => x.id === sectionId)
  const chapter = book.chapters.find((c) => c.id === section?.chapterId)

  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const [draftMsg, setDraftMsg] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<'demo' | 'live' | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    let alive = true
    getVoiceNote(sectionId).then((u) => alive && u && setAudioUrl(u))
    return () => {
      alive = false
    }
  }, [sectionId])

  // Check whether Claude is connected when the panel opens (for the status line).
  useEffect(() => {
    if (!open) return
    let alive = true
    claudeHealth()
      .then((h) => alive && setStatus(h.mode))
      .catch(() => alive && setStatus(null))
    return () => {
      alive = false
    }
  }, [open])

  async function startRec() {
    setRecError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const url = await blobToDataUrl(blob)
        setAudioUrl(url)
        setVoiceNote(sectionId, url)
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      recRef.current = mr
      setRecording(true)
    } catch (e) {
      setRecError('Microphone not available. You can type the brief instead.')
    }
  }
  function stopRec() {
    recRef.current?.stop()
    setRecording(false)
  }
  function removeNote() {
    delVoiceNote(sectionId)
    setAudioUrl(null)
  }

  async function generateDraft() {
    setErr(null)
    setDraftMsg(null)
    setDraft(null)
    setDrafting(true)
    try {
      const res = await draftSection({
        voice: book.settings.toneOfVoice,
        bookTitle: book.title,
        chapterTitle: chapter?.title,
        sectionLabel: section?.label,
        sectionTitle: section?.title,
        brief,
        sources: section?.sources ?? [],
      })
      setStatus(res.mode)
      if (res.mode === 'demo') {
        setDraftMsg(
          'Claude isn’t connected yet. Add your Anthropic API key in Vercel (ANTHROPIC_API_KEY) and this button will draft this section from your brief and tone of voice — for you to redact. Your brief is saved.',
        )
      } else {
        setDraft(res.draft ?? '')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong drafting this section.')
    } finally {
      setDrafting(false)
    }
  }

  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  function useDraft() {
    if (!draft) return
    const hasText = !isHtmlEmpty(section?.body ?? '')
    if (hasText && !confirm('Replace this section’s current text with the draft? Your current text will be overwritten.')) return
    updateBody(sectionId, draftToHtml(draft))
    setDraft(null)
    onInserted?.()
  }

  return (
    <div className={`brief${open ? ' open' : ''}`}>
      <button className="brief-toggle" onClick={() => setOpen((o) => !o)}>
        <span>✨ Brief for AI{brief.trim() ? ' · saved' : ''}</span>
        <span className="brief-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="brief-body">
          <p className="brief-help">
            Say or type what this section should be about. Later, AI drafts it in your voice — grounded in your sources — for you to adjust and redact.
          </p>
          <textarea
            className="brief-text"
            rows={3}
            placeholder="What should this section cover? Key points, the feeling, a story to include…"
            value={brief}
            onChange={(e) => updateBrief(sectionId, e.target.value)}
          />
          <div className="brief-voice">
            {!recording ? (
              <button className="btn" onClick={startRec}>● Record voice note</button>
            ) : (
              <button className="btn primary" onClick={stopRec}>■ Stop recording</button>
            )}
            {audioUrl && !recording && (
              <>
                <audio controls src={audioUrl} className="brief-audio" />
                <button className="btn ghost" onClick={removeNote}>Delete</button>
              </>
            )}
          </div>
          {recError && <p className="brief-err">{recError}</p>}
          <div className="brief-draft">
            <button className="btn primary" onClick={generateDraft} disabled={drafting}>
              {drafting ? 'Drafting…' : 'Draft this section with Claude →'}
            </button>
            {status && (
              <span className={`claude-status ${status}`}>
                <span className="dot" /> Claude · {status === 'live' ? 'connected' : 'demo mode'}
              </span>
            )}
          </div>
          {err && <p className="brief-err">{err}</p>}
          {draftMsg && <p className="brief-note">{draftMsg}</p>}
          {draft !== null && (
            <div className="draft-card">
              <div className="draft-card-head">
                <span>✨ Draft · for you to review &amp; redact</span>
                <button className="draft-x" onClick={() => setDraft(null)} title="Dismiss">✕</button>
              </div>
              <div className="draft-card-body">
                {draft.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p.trim()}</p>
                ))}
              </div>
              <div className="draft-card-actions">
                <button className="btn primary" onClick={useDraft}>
                  {isHtmlEmpty(section?.body ?? '') ? 'Place in section' : 'Replace section text'}
                </button>
                <button className="btn ghost" onClick={copyDraft}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
              <p className="draft-card-foot">
                Claude follows your integrity rules — it never invents stories or quotes. Bracketed
                <code> [placeholders] </code> mark where your own specifics belong.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FocusSection() {
  const { chapterId, sectionId } = useParams()
  const navigate = useNavigate()
  const chapters = useBookStore((s) => currentBook(s).chapters)
  const sections = useBookStore((s) => currentBook(s).sections)

  const chapter = chapters.find((c) => c.id === chapterId)
  const chSections = useMemo(() => (chapter ? sectionsOf(sections, chapter.id) : []), [sections, chapter])
  const section = chSections.find((s) => s.id === sectionId)
  const idx = chSections.findIndex((s) => s.id === sectionId)
  const prev = idx > 0 ? chSections[idx - 1] : undefined
  const next = idx >= 0 && idx < chSections.length - 1 ? chSections[idx + 1] : undefined

  const setStatus = useBookStore((s) => s.setSectionStatus)
  const [words, setWords] = useState(() => (section ? countWords(section.body) : 0))
  // Bumped when a Claude draft is placed, so the writer reloads its text.
  const [writerVersion, setWriterVersion] = useState(0)
  useEffect(() => setWords(section ? countWords(section.body) : 0), [sectionId, writerVersion]) // eslint-disable-line

  if (!chapter || !section) {
    return (
      <main className="focus">
        <div className="focus-bar">
          <button className="focus-exit" onClick={() => navigate('/overview')}>← Done</button>
        </div>
        <p className="empty" style={{ textAlign: 'center', marginTop: 60 }}>Section not found.</p>
      </main>
    )
  }

  const ordinal = chapters.find((c) => c.id === chapter.id)?.number

  return (
    <main className="focus">
      <div className="focus-bar">
        <button className="focus-exit" onClick={() => navigate(`/chapter/${chapter.id}`)} title="Back to chapter">
          ← Done
        </button>
        <span className="focus-ch">
          Chapter {String(ordinal).padStart(2, '0')} · {chapter.title || 'Untitled'}
        </span>
        <div className="focus-bar-right">
          <span className="focus-words">{words.toLocaleString()} words</span>
          <StatusSelect status={section.status} onChange={(s) => setStatus(section.id, s)} stop={false} />
        </div>
      </div>

      <div className="focus-body">
        <div className="focus-label">{section.label || 'Section'}</div>
        <EditorBoundary resetKey={section.id}>
          <SectionWriter key={section.id} section={section} onWords={setWords} titleClass="focus-title" contentVersion={writerVersion} />
        </EditorBoundary>
        <BriefPanel sectionId={section.id} onInserted={() => setWriterVersion((v) => v + 1)} />
      </div>

      <div className="focus-nav">
        {prev ? (
          <button className="btn ghost" onClick={() => navigate(`/chapter/${chapter.id}/section/${prev.id}`)}>
            ← {prev.label || prev.title || 'Previous'}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn ghost" onClick={() => navigate(`/chapter/${chapter.id}/section/${next.id}`)}>
            {next.label || next.title || 'Next'} →
          </button>
        )}
      </div>
    </main>
  )
}
