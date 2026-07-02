import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/clerk-react'

const appearance = {
  variables: {
    colorPrimary: '#8B5A3C',
    fontFamily: 'Georgia, serif',
    borderRadius: '10px',
  },
  elements: {
    // We provide our own sign-in/up toggle below, so hide Clerk's footer switch.
    footer: 'hidden' as const,
  },
}

/**
 * Full-page auth. Toggles between create-account and sign-in in one component
 * (virtual routing keeps Clerk off the URL so it never fights the app's hash
 * router). Google / email options come from the Clerk dashboard config.
 */
export function SignInScreen() {
  const [mode, setMode] = useState<'up' | 'in'>('up') // default to create-account for new visitors
  return (
    <main className="auth-screen">
      <div className="auth-brand">✦ Writing Studio</div>
      <p className="auth-tagline">Your private studio to write, publish, and grow your book.</p>

      {mode === 'up' ? (
        <SignUp routing="virtual" appearance={appearance} />
      ) : (
        <SignIn routing="virtual" appearance={appearance} />
      )}

      <button className="auth-switch" onClick={() => setMode((m) => (m === 'up' ? 'in' : 'up'))}>
        {mode === 'up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </main>
  )
}
