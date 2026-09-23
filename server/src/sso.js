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

export const SSO_SCOPE = 'openid profile email offline_access'
export const SSO_REDIRECT_URI = AZURE_REDIRECT_URI
