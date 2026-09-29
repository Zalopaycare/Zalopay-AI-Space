import { ssoConfigured, GRAPH_DELEGATED_SCOPE } from './sso.js'
import { isCompanyEmail, initialsFor } from './auth.js'
import { graphTokenFor, hasGraphTokens } from './graphTokens.js'

// Company-wide people search through Microsoft Graph for the @mention picker, using the
// *delegated* permission (User.Read.All / User.ReadBasic.All) of the person who is typing:
// their token comes from SSO sign-in (see graphTokens.js). People who signed in before the
// permission existed get it on their next sign-in; until then they see signed-in users only.

export const directoryEnabled = () => ssoConfigured && !!GRAPH_DELEGATED_SCOPE

const SELECT = 'displayName,mail,userPrincipalName,jobTitle,department'

async function graph(userId, path, params) {
  const bearer = await graphTokenFor(userId)
  if (!bearer) return { status: 0 }
  const url = new URL('https://graph.microsoft.com/v1.0' + path)
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const r = await fetch(url, { headers: { authorization: `Bearer ${bearer}`, ConsistencyLevel: 'eventual' } })
  const body = await r.json().catch(() => ({}))
  return { status: r.status, body, bearer }
}

/** Up to `limit` company people whose name or email matches `q`, searched as `userId`: [{ email, name, title, initials }]. */
export async function searchDirectory(q, userId, limit = 8) {
  const term = String(q || '').replace(/["\\]/g, '').trim()
  if (term.length < 2 || !directoryEnabled() || !userId) return []
  try {
    const { status, body } = await graph(userId, '/users', { $search: `"displayName:${term}" OR "mail:${term}"`, $select: SELECT, $top: String(limit) })
    if (!status) return []
    if (status === 401 || status === 403) {
      console.error(`[directory] Graph refused people search for user ${userId} (${status} ${body.error?.code || ''})`)
      return []
    }
    if (status !== 200) throw new Error(`search ${status}`)
    return (body.value || [])
      .map((u) => ({ email: String(u.mail || u.userPrincipalName || '').toLowerCase(), name: u.displayName || '', title: [u.jobTitle, u.department].filter(Boolean).join(' · ') }))
      .filter((u) => u.email && isCompanyEmail(u.email))
      .map((u) => ({ ...u, initials: initialsFor(u.name || u.email) }))
  } catch (e) {
    console.error('[directory] search failed:', e.message)
    return []
  }
}

export const needsRelogin = (userId) => directoryEnabled() && !hasGraphTokens(userId)

/**
 * Admin diagnostic, run with the admin's own delegated token.
 * state: ok | no_sso | needs_login | forbidden | error.
 */
export async function directoryStatus(userId) {
  if (!ssoConfigured) return { state: 'no_sso', detail: 'SSO (AZURE_*) chưa được cấu hình.' }
  if (!GRAPH_DELEGATED_SCOPE) return { state: 'no_sso', detail: 'GRAPH_DELEGATED_SCOPE đang để trống nên đăng nhập không xin quyền danh bạ.' }
  if (!hasGraphTokens(userId)) return { state: 'needs_login', scope: GRAPH_DELEGATED_SCOPE }
  try {
    const { status, body, bearer } = await graph(userId, '/users', { $select: 'displayName,mail', $top: '1' })
    if (!status) return { state: 'needs_login', scope: GRAPH_DELEGATED_SCOPE }
    let scopes = ''
    try { scopes = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).scp || '' } catch { /* opaque */ }
    if (status === 401 || status === 403) return { state: 'forbidden', scopes, detail: `${status} ${body.error?.code || ''} ${body.error?.message || ''}`.trim() }
    if (status !== 200) return { state: 'error', scopes, detail: `HTTP ${status}` }
    return { state: 'ok', scopes }
  } catch (e) {
    return { state: 'error', detail: e.message }
  }
}
