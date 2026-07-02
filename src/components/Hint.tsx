import { useRef, useState, type ReactNode } from 'react'

/**
 * A quiet tooltip. Wrap any control; on hover (or keyboard focus) a small label
 * appears after a short delay, explaining what it does in a few words. Purely
 * explanatory — it never blocks the click and disappears on mouse-out.
 */
export function Hint({
  text,
  children,
  place = 'bottom',
}: {
  text: string
  children: ReactNode
  place?: 'top' | 'bottom'
}) {
  const [show, setShow] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const open = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShow(true), 350)
  }
  const close = () => {
    window.clearTimeout(timer.current)
    setShow(false)
  }

  return (
    <span className="hint-wrap" onMouseEnter={open} onMouseLeave={close} onFocusCapture={open} onBlurCapture={close}>
      {children}
      {show && (
        <span className={`hint-note hint-${place}`} role="tooltip">
          {text}
        </span>
      )}
    </span>
  )
}
