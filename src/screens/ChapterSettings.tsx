import { useParams } from 'react-router-dom'
import { ChapterSubLayout } from '../components/ChapterSub'
import { currentBook, sectionsOf, useBookStore } from '../store/useBookStore'

export function ChapterSettings() {
  const { chapterId } = useParams()
  const chapter = useBookStore((s) => currentBook(s).chapters.find((c) => c.id === chapterId))
  const sections = useBookStore((s) => currentBook(s).sections)
  const templates = useBookStore((s) => currentBook(s).templates)
  const applyStructure = useBookStore((s) => s.applyStructure)

  if (!chapterId || !chapter) return <ChapterSubLayout chapterId={chapterId ?? ''} title="Settings"><div /></ChapterSubLayout>

  const chSections = sectionsOf(sections, chapter.id)
  const chapterEmpty = chSections.every((s) => !s.title.trim() && !s.body.trim())

  function onStructureChange(value: string) {
    const templateId = value || null
    if (templateId && templateId !== chapter!.templateId && !chapterEmpty) {
      if (!confirm("This chapter already has content. The structure's sections will be added below — nothing is deleted. Continue?")) return
    }
    applyStructure(chapter!.id, templateId)
  }

  return (
    <ChapterSubLayout chapterId={chapterId} title="Settings">
      <section className="card">
        <h2 className="card-title">Structure</h2>
        <p className="row-sub" style={{ marginBottom: 14 }}>
          Apply a reusable structure to this chapter, or write freely. Structures are managed in the book’s Settings.
        </p>
        <div className="row between">
          <div>
            <div className="row-label">Chapter structure</div>
            <div className="row-sub">
              {chapter.templateId ? 'Following a structure.' : 'Freeform — no structure applied.'}
            </div>
          </div>
          <select className="select" value={chapter.templateId ?? ''} onChange={(e) => onStructureChange(e.target.value)}>
            <option value="">No structure (freeform)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>
    </ChapterSubLayout>
  )
}
