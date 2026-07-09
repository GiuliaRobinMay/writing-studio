import { useParams } from 'react-router-dom'
import { ChapterSubLayout } from '../components/ChapterSub'
import { WorkspaceBrief } from '../components/ChapterWorkspace'
import { ChapterContextPanel } from '../components/ContextPanel'

export function ChapterBrief() {
  const { chapterId } = useParams()
  if (!chapterId) return null
  return (
    <ChapterSubLayout chapterId={chapterId} title="Brief">
      <WorkspaceBrief chapterId={chapterId} />
      {/* Chapter-level research: searches steered by the brief above; picks
          ground every section draft in this chapter. */}
      <ChapterContextPanel chapterId={chapterId} />
    </ChapterSubLayout>
  )
}
