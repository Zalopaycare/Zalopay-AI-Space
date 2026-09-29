import * as client from 'openid-client'

const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_REDIRECT_URI } = process.env

export const ssoConfigured = !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET && AZURE_REDIRECT_URI)

let configPromise = null
export function getOidcConfig() {
  if (!ssoConfigured) throw new Error('sso_not_configured')
  if (!configPromise) {
    configPromise = client.discovery(
      new URL(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`),
      AZURE_CLIENT_ID,
      AZURE_CLIENT_SECRET,
    )
  }
  return configPromise
}

export const SSO_SCOPE_BASE = 'openid profile email offline_access'
// Delegated Graph permission the tenant admin consented to, used by the @mention directory search.
// Set GRAPH_DELEGATED_SCOPE= (empty) to sign in without it.
export const GRAPH_DELEGATED_SCOPE = process.env.GRAPH_DELEGATED_SCOPE ?? 'https://graph.microsoft.com/User.Read.All'
export const SSO_SCOPE = [SSO_SCOPE_BASE, GRAPH_DELEGATED_SCOPE].filter(Boolean).join(' ')
export const SSO_REDIRECT_URI = AZURE_REDIRECT_URI
