import crypto from 'node:crypto'
import * as client from 'openid-client'
import { db } from './db.js'
import { getOidcConfig } from './sso.js'

// Per-user Microsoft Graph tokens from SSO sign-in (delegated permission, e.g. User.Read.All),
// so the @mention picker can search the company directory as the person typing.
// Tokens are AES-256-GCM encrypted at rest with a key derived from the app's secrets.

db.exec(`
CREATE TABLE IF NOT EXISTS graph_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  refresh_token TEXT,
  access_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

const KEY = crypto.createHash('sha256')
  .update(`graph-tokens:${process.env.JWT_SECRET || 'dev-secret-change-me'}:${process.env.AZURE_CLIENT_SECRET || ''}`)
  .digest()

function seal(text) {
  if (!text) return null
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.')
}

function open(sealed) {
  if (!sealed) return null
  try {
    const [iv, tag, enc] = sealed.split('.').map((p) => Buffer.from(p, 'base64'))
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
  } catch {
    return null // key rotated or corrupted — treat as no token
  }
}

/** Save the token set from an SSO sign-in or refresh. Keeps the old refresh token if none came back. */
export function saveGraphTokens(userId, tokens) {
  if (!tokens?.access_token) return
  const prev = db.prepare('SELECT refresh_token FROM graph_tokens WHERE user_id = ?').get(userId)
  const expiresAt = Date.now() + Number(tokens.expires_in || 3600) * 1000
  db.prepare(`INSERT INTO graph_tokens (user_id, refresh_token, access_token, expires_at, scope, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET refresh_token = excluded.refresh_token, access_token = excluded.access_token,
      expires_at = excluded.expires_at, scope = excluded.scope, updated_at = excluded.updated_at`)
    .run(userId, tokens.refresh_token ? seal(tokens.refresh_token) : prev?.refresh_token || null, seal(tokens.access_token), expiresAt, String(tokens.scope || ''))
}

export function dropGraphTokens(userId) {
  db.prepare('DELETE FROM graph_tokens WHERE user_id = ?').run(userId)
}

export const hasGraphTokens = (userId) => !!db.prepare('SELECT 1 FROM graph_tokens WHERE user_id = ?').get(userId)

const refreshing = new Map()

/** A valid delegated Graph access token for this user, refreshing it when close to expiry; null if none. */
export async function graphTokenFor(userId) {
  const row = db.prepare('SELECT * FROM graph_tokens WHERE user_id = ?').get(userId)
  if (!row) return null
  if (row.expires_at > Date.now() + 2 * 60_000) return open(row.access_token)
  const refresh = open(row.refresh_token)
  if (!refresh) return null
  if (!refreshing.has(userId)) {
    refreshing.set(userId, (async () => {
      try {
        const tokens = await client.refreshTokenGrant(await getOidcConfig(), refresh)
        saveGraphTokens(userId, tokens)
        return tokens.access_token
      } catch (e) {
        console.error('[graph] token refresh failed for user', userId, e.error || e.message)
        dropGraphTokens(userId) // refresh token revoked/expired → user signs in again to restore
        return null
      } finally {
        refreshing.delete(userId)
      }
    })())
  }
  return refreshing.get(userId)
}
