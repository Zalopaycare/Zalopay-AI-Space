import { normalizeTools } from '../lib/taxonomy.js'
import { submissionTpl, submissionDesc } from './submissionTpl.js'
// Shared use case registry: every page reads allCases / prdMeta / caseDetail from here.

// The 10 showcase use cases (c1…c10) are written in the 9-part template from the teams' own docs and
// live on the server (server/showcase/cases, login only). They arrive via /api/showcase after sign-in
// and are registered below with registerTemplateCases(); nothing about them ships in the web bundle.
export const prdMeta = {}

export const caseDetail = {}

export const allCases = []

export const teamsData = [
  { key: 'product', name: 'Product', count: 32, color: '#3b82f6', match: ['Product'] },
  { key: 'engineering', name: 'Engineering', count: 58, color: '#14b8a6', match: ['Engineering'] },
  { key: 'operations', name: 'Operations', count: 21, color: '#f59e0b', match: ['Corporate Ops', 'Operations'] },
  { key: 'customerService', name: 'Customer Service', count: 27, color: '#6366f1', match: ['People Enablement', 'Customer'] },
  { key: 'risk', name: 'Risk', count: 18, color: '#22c55e', match: ['Risk'] },
  { key: 'marketing', name: 'Marketing', count: 24, color: '#ef4444', match: ['Marketing'] },
  { key: 'businessDev', name: 'Business Dev.', count: 16, color: '#16a34a', match: ['Business', 'AI Transformation'] },
  { key: 'data', name: 'Data', count: 29, color: '#0ea5e9', match: ['Data', 'Business Intelligence'] },
  { key: 'hr', name: 'HR', count: 12, color: '#f43f5e', match: ['People', 'HR'] },
  { key: 'finance', name: 'Finance', count: 23, color: '#10b981', match: ['Finance', 'Legal'] },
]

const authorInfo = {
  // Built-in cases whose source doc names no author are credited to the team that published them here.
  'AI Space': { name: 'Zalopay AI Space', role: 'Ban biên tập · đăng từ tài liệu nội bộ' },
  NamNTH: { name: 'Nam. Nguyễn Trần Hoàng', role: 'Zalopay · Utility Solutions' },
  KietTT: { name: 'Kiệt. Tô Thế', role: 'Zalopay · Promotion / CRM' },
  LuanNA: { name: 'Luân. Nguyễn Anh', role: 'Zalopay · CMS / Website' },
}

export function authorInfoFor(author) {
  return authorInfo[author] || { name: author, role: 'Zalopay' }
}

export function toolColor(t) {
  return ({ GPT: '#10a37f', Claude: '#d97757', Gemini: '#4285f4', Magnify: '#2b2f45', Kling: '#2563eb', Perplexity: '#20808d', Copilot: '#6a5cff' })[t] || '#64748b'
}

// Real people's colors (their pick, or the server's fixed fallback), keyed by the name cards show.
const AUTHOR_COLOR = {}
export function avatarColor(name) {
  if (AUTHOR_COLOR[name]) return AUTHOR_COLOR[name]
  const p = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e', '#6366f1']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return p[h % p.length]
}

// Their uploaded photo (from the same submissions), or null → the colored initials circle.
const AUTHOR_PHOTO = {}
export function avatarPhoto(name) {
  return AUTHOR_PHOTO[name] || null
}

const STATUS_META = {
  inuse: { label: 'In use', up: 'IN USE', color: '#16c47f' },
  pilot: { label: 'Pilot', up: 'PILOT', color: '#2563eb' },
  planning: { label: 'Planning', up: 'PLANNING', color: '#f59e0b' },
  prototype: { label: 'Prototype', up: 'PROTOTYPE', color: '#f59e0b' },
  building: { label: 'Implementing', up: 'IMPLEMENTING', color: '#8b5cf6' },
}
export function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.inuse
}

const KIND_BY_ID = {}
const STATUS_BY_ID = {}
export function kindOf(id) {
  return KIND_BY_ID[id] || 'tech'
}
export function statusOf(id) {
  return STATUS_BY_ID[id] || 'inuse'
}

const LEVEL_META = {
  ready: { label: 'Làm theo được ngay', c: '#00723C', bg: '#E6F7EE', b: '#BFE8D2', dc: '#6ee7a8', dbg: 'rgba(59,255,168,.14)', db: 'rgba(59,255,168,.32)' },
  ref: { label: 'Tham khảo · chưa mở cho người ngoài', c: '#9A5B00', bg: '#FFF4E3', b: '#F3DCB4', dc: '#f6c96b', dbg: 'rgba(246,201,107,.16)', db: 'rgba(246,201,107,.34)' },
  report: { label: 'Báo cáo phân tích', c: '#3D4DA6', bg: '#EEF1FB', b: '#D3DAF3', dc: '#9fd0ff', dbg: 'rgba(159,208,255,.14)', db: 'rgba(159,208,255,.3)' },
}
export function levelMeta(k) {
  return LEVEL_META[k] || LEVEL_META.ready
}
export function levelChip(k, dark) {
  const m = levelMeta(k)
  return 'display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:20px;font-size:10.5px;font-weight:800;letter-spacing:.3px;white-space:nowrap;'
    + 'background:' + (dark ? m.dbg : m.bg) + ';border:1px solid ' + (dark ? m.db : m.b) + ';color:' + (dark ? m.dc : m.c) + ';'
}

/** Strips the "※" marker (content the design session proposed, not from source docs). It used to be
 *  shown in red, which read as a warning, so it now renders like any other line. */
export function hlList(arr) {
  return (arr || []).map((s) => {
    const made = s.charAt(0) === '※'
    const text = made ? s.slice(1).trim() : s
    return { text, made, color: '#3A4757', dot: '#9FB6E8' }
  })
}

// ---- Approved community submissions -------------------------------------------------
// The built-in cases above ship with the app; use cases people submit and admins approve
// come from the API and are merged into the same structures (allCases, prdMeta, caseDetail,
// kind/status/author lookups) so every page renders them exactly like the built-ins.

export const builtinCases = allCases.slice()

// Showcase use cases written in the 9-part template shape from the teams' own docs. They live on the
// server (login only) and arrive through /api/showcase after sign-in; registered here like the
// built-ins above so every page lists and renders them. Safe to call again (replaces by id).
export function registerTemplateCases(list) {
  for (const m of list) {
    for (const arr of [allCases, builtinCases]) { const i = arr.findIndex((c) => c.id === m.id); if (i >= 0) arr.splice(i, 1) }
    KIND_BY_ID[m.id] = m.kind || 'tech'
    STATUS_BY_ID[m.id] = m.status || 'inuse'
    authorInfo[m.author] = { name: m.ownerName || m.author, role: m.ownerTeam || 'Zalopay' }
    prdMeta[m.id] = { problem: m.problem?.text || (m.tldr?.[0]?.[1] || ''), result: m.tldr?.[2]?.[1] || '', topics: m.topics || [], helpful: 0, comments: 0 }
    caseDetail[m.id] = { tpl: m, difficulty: m.difficulty || '', audience: m.audience || '', level: m.level || 'ready', summary: m.desc }
    const card = {
      id: m.id, postedAt: m.postedAt || '', title: m.title, desc: m.desc, author: m.author, team: m.ownerTeam || '', category: m.category || 'Other',
      tools: normalizeTools(m.tools || []), repo: m.tech?.repo?.label || '', repoHref: m.tech?.repo?.href || '',
      audience: [m.kind === 'nontech' ? 'nontech' : 'tech'], coverUrl: m.cover || null,
    }
    // keep built-ins in id order (c1…c5, c6…) so "Mới nhất" puts the newest showcase first
    const at = allCases.findIndex((c) => !c.submitted && Number(c.id.slice(1)) > Number(m.id.slice(1)))
    allCases.splice(at < 0 ? allCases.length : at, 0, card)
    const bt = builtinCases.findIndex((c) => Number(c.id.slice(1)) > Number(m.id.slice(1)))
    builtinCases.splice(bt < 0 ? builtinCases.length : bt, 0, card)
  }
}

const KIND_MAP = { 'By tech': 'tech', 'By non-tech': 'nontech' }
const STATUS_MAP = { 'Ý tưởng': 'planning', Prototype: 'prototype', 'Đang dùng thật': 'inuse' }
const lines = (t) => String(t || '').split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean)
const firstPara = (t) => { const p = String(t || '').trim().split(/\n\s*\n/)[0] || ''; return p.length > 220 ? p.slice(0, 220).trimEnd() + '…' : p }

/** Replace the merged submissions with `subs` (approved, newest first). */
export function registerPublished(subs) {
  for (let i = allCases.length - 1; i >= 0; i--) if (!builtinCases.includes(allCases[i])) allCases.splice(i, 1)
  const cases = subs.map((s) => {
    const author = s.authorDomain || s.author || 'AI Space'
    KIND_BY_ID[s.id] = KIND_MAP[s.kind] || 'tech'
    STATUS_BY_ID[s.id] = STATUS_MAP[s.status] || 'inuse'
    if (s.authorAvatarColor) AUTHOR_COLOR[author] = s.authorAvatarColor
    if (s.authorAvatarUrl) AUTHOR_PHOTO[author] = s.authorAvatarUrl
    else delete AUTHOR_PHOTO[author]
    authorInfo[author] = { name: s.author || author, role: 'Zalopay' + (s.team ? ' · ' + s.team : '') }
    prdMeta[s.id] = { problem: s.problem, result: s.result, topics: s.topics || [], helpful: 0, comments: 0 }
    caseDetail[s.id] = {
      difficulty: s.level || '',
      audience: s.audience || '',
      summary: s.problem,
      problem: s.problem,
      solution: lines(s.solution),
      result: lines(s.result),
      next: lines(s.limits),
      pain: [],
      level: 'ready',
      howto: { prep: lines(s.prep), steps: [], pitfalls: [], contact: s.contact ? [s.contact] : [] },
      code: s.prompt ? [{ title: 'PROMPT', code: s.prompt }] : [],
      // Posts sent with the 9-part form carry `extra`; render those through the template directly.
      ...(s.extra ? { tpl: submissionTpl(s) } : {}),
    }
    return {
      id: s.id, title: s.title, desc: submissionDesc(s) || firstPara(lines(s.solution).join(' · ') || s.problem), author, team: s.team || '',
      category: [].concat(s.category)[0] || 'Khác', tools: normalizeTools(s.tools), repo: '', repoHref: s.link || '',
      audience: [], publishedAt: s.publishedAt || s.time, submitted: true, authorId: s.authorId, coverUrl: s.coverUrl || null,
      anonymous: !!s.anonymous, alias: s.alias || null, realAuthor: s.realAuthor || null,
    }
  })
  allCases.unshift(...cases)
}

/** dd/mm/yyyy for a card's posting date (approved submissions: publishedAt; built-ins: postedAt). */
export function postedLabel(c) {
  const raw = c.publishedAt || c.postedAt
  if (!raw) return ''
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + 'T00:00:00' : String(raw).replace(' ', 'T') + (/[zZ+]/.test(String(raw)) ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** "Mới nhất" order used everywhere (Home + Library): approved community posts newest first
 *  (they're already sorted that way), then the built-in cases, newest built-in first. */
export function newestFirst(list) {
  return [...list.filter((c) => c.submitted), ...list.filter((c) => !c.submitted).reverse()]
}
