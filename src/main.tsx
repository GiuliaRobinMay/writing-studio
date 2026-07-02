import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'
import { useBookStore } from './store/useBookStore'
import { Layout } from './components/Layout'
import { Dashboard } from './screens/Dashboard'
import { Overview } from './screens/Overview'
import { About } from './screens/About'
import { Editor } from './screens/Editor'
import { ChapterBrief } from './screens/ChapterBrief'
import { ChapterResources } from './screens/ChapterResources'
import { ChapterSettings } from './screens/ChapterSettings'
import { FocusSection } from './screens/FocusSection'
import { Reader } from './screens/Reader'
import { Publish } from './screens/Publish'
import { Grow } from './screens/Grow'
import { ShareStudio } from './screens/ShareStudio'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import './styles/theme.css'
import './styles/app.css'
import './styles/auth.css'
import './styles/hints.css'
import './styles/dashboard.css'
import './styles/about.css'
import './styles/editor.css'
import './styles/focus.css'
import './styles/reader.css'
import './styles/settings.css'
import './styles/notes.css'
import './styles/workspace.css'
import './styles/publish.css'
import './styles/share.css'
import './styles/onboarding.css'

// Hash router → works when opened from the file system or any static host.
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'overview', element: <Overview /> },
      { path: 'about', element: <About /> },
      { path: 'chapter/:chapterId', element: <Editor /> },
      { path: 'chapter/:chapterId/brief', element: <ChapterBrief /> },
      { path: 'chapter/:chapterId/resources', element: <ChapterResources /> },
      { path: 'chapter/:chapterId/settings', element: <ChapterSettings /> },
      { path: 'chapter/:chapterId/section/:sectionId', element: <FocusSection /> },
      { path: 'read', element: <Reader /> },
      { path: 'read/:chapterId', element: <Reader /> },
      { path: 'publish', element: <Publish /> },
      { path: 'grow', element: <Grow /> },
      { path: 'share', element: <ShareStudio /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

// Note: no <React.StrictMode>. StrictMode double-invokes mount/unmount in dev,
// which amplifies a TipTap editor teardown quirk ("Failed to execute
// 'removeChild'") on section navigation. StrictMode is inert in production, so
// dropping it makes dev mirror prod. The teardown itself is guarded by
// <EditorBoundary> around the editor so a transient unmount error self-recovers.
// Dev-only debug handle (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __btbStore: typeof useBookStore }).__btbStore = useBookStore

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthGate>
    <RouterProvider router={router} />
  </AuthGate>,
)
