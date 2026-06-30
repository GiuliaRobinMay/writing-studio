import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { currentBook, sectionsOf, useBookStore } from '../store/useBookStore'
import { countWords } from '../lib/text'
import { StatusSelect } from '../components/StatusChip'
import { SectionWriter } from '../components/SectionEditor'
import { getVoiceNote, setVoiceNote, delVoiceNote, blobToDataUrl } from '../lib/voicenote'

function BriefPanel({ sectionId }: { sectionId: string }) {
  const brief = useBookStore((s) => currentBook(s).sections.find((x) => x.id === sectionId)?.brief ?? '')
  const updateBrief = useBookStore((s) => s.updateSectionBrief)
  const brainConnected = useBookStore((s) => currentBook(s).settings.brain.connected)

  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recError, setRecError] = useState<string | null>(null)
  const [draftMsg, setDraftMsg] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    let alive = true
    getVoiceNote(sectionId).then((u) => alive && u && setAudioUrl(u))
    return () => {
      alive = false
    }
  }, [sectionId])

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

  function draft() {
    setDraftMsg(
      'AI drafting isn’t connected yet. Once Claude is wired up (Settings), it will write a first draft from this brief' +
        (brainConnected ? ', your brain,' : '') +
        ' and your tone of voice — for you to redact. Your brief is saved and ready.',
    )
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
            <button className="btn primary" onClick={draft}>Draft this section with AI →</button>
          </div>
          {draftMsg && <p className="brief-note">{draftMsg}</p>}
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
  useEffect(() => setWords(section ? countWords(section.body) : 0), [sectionId]) // eslint-disable-line

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
        <SectionWriter key={section.id} section={section} onWords={setWords} titleClass="focus-title" />
        <BriefPanel sectionId={section.id} />
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
