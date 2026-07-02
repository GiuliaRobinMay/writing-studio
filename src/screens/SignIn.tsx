import { SignIn } from '@clerk/clerk-react'

/**
 * Full-page sign-in / sign-up. Clerk renders the Google / Facebook / email
 * options based on what's enabled in the Clerk dashboard — no per-provider code
 * here. Shown only when a Clerk key is set and the visitor is signed out.
 */
export function SignInScreen() {
  return (
    <main className="auth-screen">
      <div className="auth-brand">✦ Writing Studio</div>
      <p className="auth-tagline">
        Your private studio to write, publish, and grow your book.
      </p>
      <SignIn
        routing="hash"
        appearance={{
          variables: {
            colorPrimary: '#8B5A3C',
            fontFamily: 'Georgia, serif',
            borderRadius: '10px',
          },
        }}
      />
    </main>
  )
}
