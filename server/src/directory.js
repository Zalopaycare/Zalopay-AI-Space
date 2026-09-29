import { ssoConfigured } from './sso.js'
import { isCompanyEmail, initialsFor } from './auth.js'

// Company-wide people search through Microsoft Graph, using the SSO app's own credentials
// (client credentials flow). Needs the *application* permission User.Read.All (or
// User.ReadBasic.All) with admin consent on that app registration; without it every search
// returns [] and the mention picker falls back to people who have signed in.

const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env
let token = null // { value, expiresAt }
let disabledUntil = 0

async function graphToken() {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value
  const r = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d.access_token) throw new Error(`token ${r.status} ${d.error || ''}`)
  token = { value: d.access_token, expiresAt: Date.now() + Number(d.expires_in || 3600) * 1000 }
  return token.value
}

export const directoryEnabled = () => ssoConfigured && Date.now() > disabledUntil

/** Up to `limit` company people whose name or email matches `q`: [{ email, name, title, initials }]. */
export async function searchDirectory(q, limit = 8) {
  const term = String(q || '').replace(/["\\]/g, '').trim()
  if (term.length < 2 || !directoryEnabled()) return []
  try {
    const url = new URL('https://graph.microsoft.com/v1.0/users')
    url.searchParams.set('$search', `"displayName:${term}" OR "mail:${term}"`)
    url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle,department')
    url.searchParams.set('$top', String(limit))
    const r = await fetch(url, { headers: { authorization: `Bearer ${await graphToken()}`, ConsistencyLevel: 'eventual' } })
    if (r.status === 401 || r.status === 403) {
      // Permission not granted yet — stop hammering Graph for a while, and drop the token:
      // one issued before admin consent never gains the new role, so fetch a fresh one next time.
      token = null
      disabledUntil = Date.now() + 5 * 60_000
      console.error(`[directory] Graph refused people search (${r.status}); grant User.Read.All application permission with admin consent to enable it.`)
      return []
    }
    if (!r.ok) throw new Error(`search ${r.status}`)
    const d = await r.json()
    return (d.value || [])
      .map((u) => ({ email: String(u.mail || u.userPrincipalName || '').toLowerCase(), name: u.displayName || '', title: [u.jobTitle, u.department].filter(Boolean).join(' · ') }))
      .filter((u) => u.email && isCompanyEmail(u.email))
      .map((u) => ({ ...u, initials: initialsFor(u.name || u.email) }))
  } catch (e) {
    console.error('[directory] search failed:', e.message)
    return []
  }
}

/**
 * Admin diagnostic: can the app search the company directory right now?
 * state: ok | no_sso | token_error | forbidden | error. Always uses a fresh token and
 * clears the back-off, so it reflects permissions granted a moment ago.
 */
export async function directoryStatus() {
  if (!ssoConfigured) return { state: 'no_sso', detail: 'SSO (AZURE_*) chưa được cấu hình.' }
  token = null
  disabledUntil = 0
  let bearer
  try { bearer = await graphToken() } catch (e) { return { state: 'token_error', detail: e.message } }
  let roles = []
  try { roles = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).roles || [] } catch { /* opaque token */ }
  const url = new URL('https://graph.microsoft.com/v1.0/users')
  url.searchParams.set('$select', 'displayName,mail')
  url.searchParams.set('$top', '1')
  try {
    const r = await fetch(url, { headers: { authorization: `Bearer ${bearer}` } })
    if (r.status === 401 || r.status === 403) {
      const d = await r.json().catch(() => ({}))
      return { state: 'forbidden', roles, detail: `${r.status} ${d.error?.code || ''} ${d.error?.message || ''}`.trim() }
    }
    if (!r.ok) return { state: 'error', roles, detail: `HTTP ${r.status}` }
    return { state: 'ok', roles }
  } catch (e) {
    return { state: 'error', roles, detail: e.message }
  }
}
