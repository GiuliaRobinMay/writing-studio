import { useState, type ReactNode } from 'react'
import { ClerkProvider, SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { SignInScreen } from '../screens/SignIn'
import { FirstRun } from '../screens/FirstRun'

// Clerk publishable key — a PUBLIC, client-side key (safe to ship). Set it in
// `.env` locally and in Vercel → Environment Variables to turn auth on.
const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

/** True when Clerk auth is configured — components can guard Clerk hooks on this. */
export const authEnabled = !!KEY

/** Runs the first-run onboarding once per account, then renders the app. */
function PostAuth({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const flag = user ? `btb-onboarded:${user.id}` : ''
  const [onboarded, setOnboarded] = useState(() => (flag ? localStorage.getItem(flag) === '1' : false))

  if (!isLoaded) return null
  if (user && !onboarded) {
    return (
      <FirstRun
        user={user}
        onDone={() => {
          try {
            localStorage.setItem(flag, '1')
          } catch {
            /* ignore */
          }
          setOnboarded(true)
        }}
      />
    )
  }
  return <>{children}</>
}

/**
 * Gates the app behind Clerk sign-in — but only once a key is configured.
 * With no key set, the app runs open (today's local-first behaviour), so the
 * build never breaks and auth can be switched on by adding one env var.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!KEY) return <>{children}</>
  return (
    <ClerkProvider publishableKey={KEY} afterSignOutUrl="/">
      <SignedIn>
        <PostAuth>{children}</PostAuth>
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </ClerkProvider>
  )
}
