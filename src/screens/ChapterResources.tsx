import { useParams } from 'react-router-dom'
import { ChapterSubLayout } from '../components/ChapterSub'
import { WorkspaceResources } from '../components/ChapterWorkspace'

export function ChapterResources() {
  const { chapterId } = useParams()
  if (!chapterId) return null
  return (
    <ChapterSubLayout chapterId={chapterId} title="Resources">
      <WorkspaceResources chapterId={chapterId} />
    </ChapterSubLayout>
  )
}
