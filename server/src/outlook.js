import { ssoConfigured } from './sso.js'
import { calendarTokenFor } from './graphTokens.js'

// Outlook meetings through Microsoft Graph, acting as the event's host with their own delegated token
// (Calendars.ReadWrite, graphTokens.js): the meeting lives in the host's calendar, the people interested
// are its attendees, and Outlook itself sends the invitations, updates and cancellations and keeps track of
// who accepted. OUTLOOK_EVENTS=off turns it off (events then fall back to the site's own .ics invitations).

export const outlookEnabled = () => ssoConfigured && String(process.env.OUTLOOK_EVENTS || '').toLowerCase() !== 'off'

// GRAPH_BASE_URL: only for trying it against a stand-in on a developer's machine
const GRAPH = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0'

/** One Graph call as `userId`: { status, body }; status 0 = no calendar access for that person. */
export async function graph(userId, method, path, body) {
  const token = await calendarTokenFor(userId)
  if (!token) return { status: 0, body: {} }
  try {
    const r = await fetch(GRAPH + path, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', Prefer: 'outlook.timezone="UTC"' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = r.status === 202 || r.status === 204 ? {} : await r.json().catch(() => ({}))
    if (r.status >= 400) console.error(`[outlook] ${method} ${path.split('?')[0]} → ${r.status} ${json.error?.code || ''} ${String(json.error?.message || '').slice(0, 160)}`)
    return { status: r.status, body: json }
  } catch (e) {
    console.error('[outlook] request failed:', e.message)
    return { status: -1, body: {} }
  }
}

/** Create a meeting in the person's calendar; returns its id, or null. `tx` makes a retry safe (no duplicate). */
export async function createMeeting(userId, meeting, tx) {
  const r = await graph(userId, 'POST', '/me/events', { ...meeting, transactionId: tx })
  return r.status === 201 ? r.body.id : null
}
/** Change a meeting (fields and/or attendees); Outlook tells the attendees. true when done. */
export async function updateMeeting(userId, id, patch) {
  const r = await graph(userId, 'PATCH', `/me/events/${encodeURIComponent(id)}`, patch)
  return r.status === 200 ? true : r.status === 404 ? 'gone' : false
}
/** Cancel a meeting: the attendees get Outlook's cancellation with `comment`. */
export async function cancelMeeting(userId, id, comment) {
  const r = await graph(userId, 'POST', `/me/events/${encodeURIComponent(id)}/cancel`, { comment: String(comment || '').slice(0, 500) })
  return r.status === 202 || r.status === 404
}
/** The attendees' answers: [{ email, status }] (accepted | tentativelyAccepted | declined | none…), or null. */
export async function meetingResponses(userId, id) {
  const r = await graph(userId, 'GET', `/me/events/${encodeURIComponent(id)}?$select=attendees`)
  if (r.status === 404) return 'gone'
  if (r.status !== 200) return null
  return (r.body.attendees || []).map((a) => ({ email: String(a.emailAddress?.address || '').toLowerCase(), status: a.status?.response || 'none' })).filter((a) => a.email)
}
