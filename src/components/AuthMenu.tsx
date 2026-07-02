import { UserButton } from '@clerk/clerk-react'
import { authEnabled } from '../auth/AuthGate'

/** Clerk avatar + sign-out. Renders nothing when auth isn't configured. */
export function AuthMenu() {
  if (!authEnabled) return null
  return <UserButton afterSignOutUrl="/" />
}
