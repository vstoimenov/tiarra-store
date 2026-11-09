import 'server-only'
import { z } from 'zod'

const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() })
const locationSchema = z.object({ id: z.string().min(1), name: z.string(), addressLine1: z.string(), postalCode: z.string(), country: z.string() }).passthrough()

/** Credentials are supplied only through server environment variables. */
async function authenticate() {
  const clientId = process.env.BOXNOW_CLIENT_ID
  const clientSecret = process.env.BOXNOW_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('BOXNOW_NOT_CONFIGURED')
  const response = await fetch('https://api-production.boxnow.bg/api/v1/auth-sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('BOXNOW_AUTH_FAILED')
  return tokenSchema.parse(await response.json()).access_token
}

/** Fetch and validate destinations on the server before accepting a locker selection. */
export async function getBoxNowDestinations() {
  const token = await authenticate()
  const response = await fetch('https://api-production.boxnow.bg/api/v1/destinations', {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('BOXNOW_DESTINATIONS_UNAVAILABLE')
  return z.object({ data: z.array(locationSchema) }).parse(await response.json()).data
}
