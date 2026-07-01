import { Component, type ReactNode } from 'react'

/**
 * Guards the rich-text editor subtree. TipTap tears down its own ProseMirror
 * DOM on unmount; during fast section navigation React can then try to remove a
 * node ProseMirror already removed, throwing "Failed to execute 'removeChild'".
 * That error otherwise bubbles to the router's full-screen error page and
 * strands the reader.
 *
 * The failing unmount belongs to the *outgoing* editor, so it is benign — we
 * just re-render the incoming one. We recover immediately in componentDidCatch
 * rather than waiting for a prop change (by catch time `resetKey` is already the
 * new value, so a "did it change?" check would miss). A small retry cap guards
 * against an unmount error that somehow recurs on mount; it resets whenever the
 * reader navigates to a genuinely new section.
 */
interface Props {
  resetKey: string
  children: ReactNode
}
interface State {
  hasError: boolean
  retries: number
}

export class EditorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retries: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch() {
    // Benign teardown error — recover at once by rendering the current child.
    if (this.state.retries < 3) {
      this.setState((s) => ({ hasError: false, retries: s.retries + 1 }))
    }
  }

  componentDidUpdate(prev: Props) {
    // New section → clear any lingering error state and the retry budget.
    if (prev.resetKey !== this.props.resetKey && (this.state.hasError || this.state.retries)) {
      this.setState({ hasError: false, retries: 0 })
    }
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
