import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './screens/Dashboard'
import { Overview } from './screens/Overview'
import { About } from './screens/About'
import { Editor } from './screens/Editor'
import { FocusSection } from './screens/FocusSection'
import { Reader } from './screens/Reader'
import { Settings } from './screens/Settings'
import './styles/theme.css'
import './styles/app.css'
import './styles/dashboard.css'
import './styles/about.css'
import './styles/editor.css'
import './styles/focus.css'
import './styles/reader.css'
import './styles/settings.css'
import './styles/notes.css'

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
      { path: 'chapter/:chapterId/section/:sectionId', element: <FocusSection /> },
      { path: 'read', element: <Reader /> },
      { path: 'read/:chapterId', element: <Reader /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
