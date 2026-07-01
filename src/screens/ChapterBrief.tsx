import { useParams } from 'react-router-dom'
import { ChapterSubLayout } from '../components/ChapterSub'
import { WorkspaceBrief } from '../components/ChapterWorkspace'

export function ChapterBrief() {
  const { chapterId } = useParams()
  if (!chapterId) return null
  return (
    <ChapterSubLayout chapterId={chapterId} title="Brief">
      <WorkspaceBrief chapterId={chapterId} />
    </ChapterSubLayout>
  )
}
