import type { ReactNode } from 'react'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import { SignInScreen } from '../screens/SignIn'

// Clerk publishable key — a PUBLIC, client-side key (safe to ship). Set it in
// `.env` locally and in Vercel → Environment Variables to turn auth on.
const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

/**
 * Gates the app behind Clerk sign-in — but only once a key is configured.
 * With no key set, the app runs open (today's local-first behaviour), so the
 * build never breaks and auth can be switched on by adding one env var.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!KEY) return <>{children}</>
  return (
    <ClerkProvider publishableKey={KEY} afterSignOutUrl="/">
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </ClerkProvider>
  )
}
