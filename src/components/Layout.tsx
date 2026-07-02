import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthMenu } from './AuthMenu'
import { currentBook, useBookStore } from '../store/useBookStore'
import { mix, rgba } from '../lib/color'

/** Push the current book's theme, accent, and reading font onto :root. */
function useApplyAppearance() {
  const theme = useBookStore((s) => currentBook(s).settings.theme)
  const accent = useBookStore((s) => currentBook(s).settings.accent)
  const readingFont = useBookStore((s) => currentBook(s).settings.readingFont)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-soft', mix(accent, [255, 255, 255], 0.2))
    root.style.setProperty('--accent-wash', rgba(accent, theme === 'dark' ? 0.18 : 0.1))
    root.style.setProperty('--reading-font', readingFont)
  }, [theme, accent, readingFont])
}

/** The "⋯" overflow menu — Foundation & Settings live here to keep it minimal. */
function MoreMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  const active = loc.pathname === '/about' || loc.pathname === '/settings' || loc.pathname === '/share'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="more-menu" ref={ref}>
      <button
        className={`more-btn${open || active ? ' on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        title="More"
      >
        ⋮
      </button>
      {open && (
        <div className="more-pop">
          <NavLink to="/about" onClick={() => setOpen(false)}>
            Foundation
          </NavLink>
          <NavLink to="/share" onClick={() => setOpen(false)}>
            Show your work
          </NavLink>
          <NavLink to="/settings" onClick={() => setOpen(false)}>
            Settings
          </NavLink>
        </div>
      )}
    </div>
  )
}

export function Layout() {
  useApplyAppearance()
  const studioName = useBookStore((s) => s.studioName)
  const path = useLocation().pathname
  const onDashboard = path === '/'
  // Focus mode and the new-book wizard are full-bleed — no topbar.
  if (path.includes('/section/') || path === '/onboarding') return <Outlet />

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand" title="Back to your library">
          <span className="mark">✦</span>
          <span className="brand-name">{studioName || 'Writing Studio'}</span>
        </NavLink>
        <div className="topbar-right">
          {!onDashboard && (
            <nav className="nav">
              <NavLink to="/overview" end>
                Write
              </NavLink>
              <NavLink to="/read">Read</NavLink>
              <NavLink to="/publish">Publish</NavLink>
              <NavLink to="/grow">Grow</NavLink>
              <MoreMenu />
            </nav>
          )}
          <AuthMenu />
        </div>
      </header>
      <Outlet />
    </div>
  )
}
