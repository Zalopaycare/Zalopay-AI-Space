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

// ---- Outlook calendar (events become meetings in the host's calendar: outlook.js) ----
export const CALENDAR_SCOPE = 'https://graph.microsoft.com/Calendars.ReadWrite'
const scpOf = (jwt) => { try { return String(JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString()).scp || '') } catch { return '' } }
const calFailedAt = new Map()

/**
 * A delegated token that may write this person's Outlook calendar, or null. Sign-in doesn't ask for it:
 * the admins consented to Calendars.ReadWrite for the whole company, so the refresh token from sign-in is
 * redeemed for it when needed (no new sign-in). A refusal is remembered for 30 minutes; the token used for
 * the directory search is left alone either way.
 */
export async function calendarTokenFor(userId) {
  const row = db.prepare('SELECT * FROM graph_tokens WHERE user_id = ?').get(userId)
  if (!row) return null
  const access = open(row.access_token)
  if (access && row.expires_at > Date.now() + 2 * 60_000 && /Calendars\.ReadWrite/i.test(scpOf(access))) return access
  if (calFailedAt.get(userId) > Date.now() - 30 * 60_000) return null
  const refresh = open(row.refresh_token)
  if (!refresh) return null
  const key = 'cal:' + userId
  if (!refreshing.has(key)) {
    refreshing.set(key, (async () => {
      try {
        const scope = ['openid profile email offline_access', String(row.scope || '').split(/\s+/).filter((s) => /^https:\/\/graph\.microsoft\.com\//i.test(s) && !/Calendars\./i.test(s)).join(' '), CALENDAR_SCOPE].filter(Boolean).join(' ')
        const tokens = await client.refreshTokenGrant(await getOidcConfig(), refresh, { scope })
        if (!/Calendars\.ReadWrite/i.test(scpOf(tokens.access_token))) throw new Error('calendar scope not granted')
        saveGraphTokens(userId, tokens)
        return tokens.access_token
      } catch (e) {
        console.error('[outlook] no calendar access for user', userId, e.error || e.message)
        calFailedAt.set(userId, Date.now())
        return null
      } finally {
        refreshing.delete(key)
      }
    })())
  }
  return refreshing.get(key)
}
