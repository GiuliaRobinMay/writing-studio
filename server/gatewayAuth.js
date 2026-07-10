// The app's own gateway identity. The Vercel functions authenticate to the
// BIG TRIBE BRAIN gateway as a SERVICE PRINCIPAL: they mint a short-lived
// Auth0 client-credentials JWT (audience = the graphrag API) and the gateway
// verifies it like any other token — authorization stays in collection_grants
// (writing-studio-service is a contributor on the collection). No static
// long-lived secret ships anywhere; tokens expire and are re-minted here.
//
// Resolution order for every request:
//   1. x-mcp-token header   — the author's own token (Auth0 login), once built
//   2. GRAPHRAG_MCP_TOKEN   — a manually-provided static token (dev/testing)
//   3. minted service token — AUTH0 client credentials (the deployed default)

const AUTH0_DOMAIN = 'dev-5xv3av4z2cx3af7r.eu.auth0.com'
const AUDIENCE = 'https://graphrag.bigtribebuilders.com'

let cached = { token: null, expiresAt: 0 }

async function mintServiceToken() {
  const clientId = process.env.GRAPHRAG_STUDIO_CLIENT_ID
  const clientSecret = process.env.GRAPHRAG_STUDIO_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  // re-mint 5 minutes before expiry; Auth0 M2M tokens live 24h by default
  if (cached.token && Date.now() < cached.expiresAt - 300_000) return cached.token
  const r = await fetch(`https://${process.env.AUTH0_DOMAIN || AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: process.env.GRAPHRAG_AUDIENCE || AUDIENCE,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) throw new Error(`Auth0 token mint failed (${r.status})`)
  const j = await r.json()
  cached = { token: j.access_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000 }
  return cached.token
}

/** The gateway token for this request, by the resolution order above. */
export async function resolveMcpToken(req) {
  const fromHeader = req?.headers?.['x-mcp-token']
  if (fromHeader) return fromHeader
  if (process.env.GRAPHRAG_MCP_TOKEN) return process.env.GRAPHRAG_MCP_TOKEN
  return mintServiceToken()
}
