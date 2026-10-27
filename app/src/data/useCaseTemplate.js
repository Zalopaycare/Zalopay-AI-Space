import { hlList, statusOf } from './useCases.js'

// Shapes every use case into the 9-part "Template trình bày Use Case" (Zalopay AI Space, 30/09/2026):
//   hero fields · 1 Tóm tắt 30 giây · 2 Bài toán · 3 Giải pháp · 4 Kết quả · 5 Tự áp dụng
//   6 An toàn & giới hạn · 7 Demo · 8 Chi tiết kỹ thuật · 9 Tiếp theo & liên hệ
// Built-in cases get their template-only fields from EXTRA below (all taken from the source docs
// already in useCases.js — nothing new is claimed). Parts with no data come back empty and are hidden.

// Header facts (owner, team, date) still marked "[cần bổ sung]" in the source doc are left out instead of shown.
const known = (v) => (v && !/cần bổ sung/i.test(String(v)) ? String(v) : '')

export const TYPE_LABEL = { tool: 'Công cụ dùng ngay', guide: 'Hướng dẫn', case: 'Câu chuyện thực tế', proposal: 'Đề xuất' }
export const STATUS_LABEL = { inuse: 'Đang dùng', pilot: 'Thử nghiệm', prototype: 'Thử nghiệm', building: 'Đang làm', planning: 'Ý tưởng' }

// Where each source table belongs in the template: problem · result · apply · safety · tech.
const EXTRA = {} // built-in cases now come from server/showcase in the template shape (see fromTpl)

const firstLine = (arr) => (arr && arr[0] ? arr[0] : '')
const pick = (arr, idx) => (idx || []).map((i) => arr[i]).filter(Boolean)
const fmtDate = (s) => { const d = s ? new Date(String(s).replace(' ', 'T') + (/[zZ+]/.test(String(s)) ? '' : 'Z')) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '' }

// "Quên mask … → case báo lỗi oan" → { meet: 'case báo lỗi oan', why: 'Quên mask …' }
function pitfallRow(text) {
  const i = text.indexOf(' → ')
  return i > 0 ? { meet: text.slice(i + 3).replace(/\.$/, ''), why: text.slice(0, i) } : { meet: text, why: '' }
}

const arr = (v) => (Array.isArray(v) ? v : [])

/** Cases written directly in the template shape (data/cases/*.js) — fill defaults so every field exists. */
function fromTpl(c, m) {
  const ex = m.exhibition && m.exhibition.problem ? m.exhibition : null
  const p = m.problem || {}, so = m.solution || {}, r = m.result || {}, a = m.apply || {}, sa = m.safety || {}, te = m.tech || {}, n = m.next || {}
  // Lỗi hay gặp is optional: shown only when the source lists some.
  const pit = arr(a.pitfalls).map((x) => (typeof x === 'string' ? pitfallRow(x) : x))
  const apply = {
    // one name for every use case, whatever its type
    title: 'Tự áp dụng',
    intro: a.intro || '', fit: { yes: arr(a.fit?.yes), no: arr(a.fit?.no) },
    promptTarget: m.promptTarget || (c.tools || []).join(' / '),
    prep: arr(a.prep), prepPrompt: a.prepPrompt || null,
    steps: arr(a.steps), stepSections: arr(a.stepSections).map((s, i) => ({ id: s.id || 'step' + i, title: s.title, sub: s.sub || '', blocks: arr(s.blocks), open: true })), blocks: arr(a.blocks), code: arr(a.code), refTables: arr(a.refTables),
    success: arr(a.success), samples: arr(a.samples), images: arr(a.images),
    pitfalls: pit, pitfallTable: null,
  }
  apply.empty = !apply.intro && !apply.fit.yes.length && !apply.fit.no.length && !apply.prep.length && !apply.steps.length && !apply.stepSections.length && !apply.blocks.length && !apply.code.length && !apply.refTables.length && !apply.success.length && !apply.images.length && !pit.length
  return {
    hero: {
      type: TYPE_LABEL[m.type] || '', status: STATUS_LABEL[m.status] || '', statusNote: m.statusNote || '',
      toolName: m.toolName || '', audience: m.audience || '', difficulty: m.difficulty || '', access: m.access || '',
      // owner drops Microsoft's "(8)" counters
      tools: c.tools || [], owner: String(known(m.ownerName) || (m.author === 'AI Space' || m.author === m.ownerTeam ? '' : c.author)).replace(/\s*\(\d+\)/g, ''), ownerTeam: known(m.ownerTeam) || known(c.team), updated: known(m.updated),
      // everyone who built it, as the booth's "Member:" line on AI Exhibition shows them
      members: arr(m.members),
    },
    stats: arr(m.stats).slice(0, 3),
    tldr: arr(m.tldr).filter((row) => row && row[1]),
    // A booth's own Vấn đề / Giải pháp from the AI Exhibition (m.exhibition) replaces the rewritten ones.
    problem: { text: ex ? ex.problem : p.text || '', rich: !!ex, bullets: ex ? [] : arr(p.bullets), tables: arr(p.tables), images: arr(p.images) },
    solution: { analogy: ex ? '' : so.analogy || '', text: ex ? ex.solution : so.text || '', rich: !!ex, steps: ex ? [] : arr(so.steps), images: arr(so.images) },
    result: { highlights: arr(r.highlights), bullets: arr(r.bullets), beforeAfter: r.beforeAfter && arr(r.beforeAfter.rows).length ? r.beforeAfter : null, tables: arr(r.tables), note: r.note || '', images: arr(r.images) },
    apply,
    safety: { rules: arr(sa.rules), limits: arr(sa.limits), tables: arr(sa.tables) },
    demo: arr(m.demo).filter((g) => g && g.src),
    tech: { bullets: arr(te.bullets), tables: arr(te.tables), code: arr(te.code), images: arr(te.images), repo: te.repo && te.repo.label ? te.repo : null },
    next: { steps: arr(n.steps), contact: arr(n.contact), link: n.link || '' },
  }
}

// Contact lines in the source docs mix people with goals, notes and doc links ("Phụ trách: …",
// "Mục tiêu: …", "Tài liệu liên quan: … — https://…"). Only the people go to the hero.
const PERSON = /^(người\s+)?(phụ trách|pic\b|cùng làm|review|đóng góp)|^sre\b/i
function splitContacts(lines) {
  const people = [], links = []
  for (const line of lines) {
    const s = String(line || '')
    const at = s.indexOf(':')
    const label = at > 0 ? s.slice(0, at).trim() : ''
    const value = at > 0 ? s.slice(at + 1).trim() : s.trim()
    const url = /https?:\/\/[^\s,;)]+/.exec(s)
    if (url) links.push({ kind: 'doc', label: value.split(' — ')[0].replace(url[0], '').trim() || label || 'Tài liệu', href: url[0] })
    // names drop Microsoft's "(8)" counters, as the owner does
    else if (PERSON.test(label) && !/^\[cần bổ sung/i.test(value)) people.push((/phụ trách|pic\b/i.test(label) ? value : `${label}: ${value}`).replace(/\s*\(\d+\)/g, ''))
  }
  return { people, links }
}

// There is no "Tiếp theo & liên hệ" part: the repo and the docs become links at the top of
// "Tự áp dụng", and the people to contact sit in the hero under the owner.
export function buildTemplate(c, cd, info) {
  const tp = buildParts(c, cd, info)
  const { people, links: docLinks } = splitContacts(tp.next.contact)
  // A repo may come as a name only (no link); it is still listed, as text.
  const links = [
    tp.tech.repo && { kind: 'repo', label: tp.tech.repo.label, href: tp.tech.repo.href || '' },
    tp.next.link && { kind: 'doc', label: 'Tài liệu gốc', href: tp.next.link },
    ...docLinks,
  ].filter(Boolean)
  tp.apply = { ...tp.apply, links, empty: tp.apply.empty && !links.length }
  tp.hero = { ...tp.hero, contact: people }
  tp.tech = { ...tp.tech, repo: null }
  // No "Tóm tắt" (Vấn đề / Giải pháp / Kết quả / Dùng khi) box: the page goes straight to Bài toán | Giải pháp.
  tp.tldr = []
  return tp
}

function buildParts(c, cd, info) {
  if (cd.tpl) return fromTpl(c, cd.tpl)
  const x = EXTRA[c.id] || {}
  const howto = cd.howto || {}
  const guide = cd.guide || null
  const gsec = (id) => guide && guide.sections.find((s) => s.id === id)
  const roleOf = (tb) => (x.tableRole || {})[tb.title] || (tb.cols.length === 3 ? 'result' : 'tech')
  const tables = (cd.tables || []).map((tb) => ({ ...tb, note: tb.note || '' }))
  const byRole = (r) => tables.filter((tb) => roleOf(tb) === r)
  const next = cd.next || []
  const texts = (a) => hlList(a).map((it) => it.text)

  // 5 · Tự áp dụng
  let prep = x.noPrep ? [] : texts(howto.prep)
  let prepPrompt = null
  let stepSections = []
  let pitfallTable = null
  let success = texts(howto.success)
  if (guide) {
    const p = gsec('prep')
    const tb = p && p.blocks.find((b) => b.type === 'table')
    if (tb) prep = tb.rows.map((r) => `${r[0]} — ${r[1]}`)
    prepPrompt = p && p.blocks.find((b) => b.type === 'prompt')
    stepSections = ['flow', 'install', 'naming', 'deploy', 'status', 'domain', 'stop'].map(gsec).filter(Boolean)
    const e = gsec('errors')
    pitfallTable = e ? e.blocks : null
    success = ['Sau khi cài: AI báo API check: PASS.', 'Sau khi deploy: AI báo THÀNH CÔNG kèm dòng Domain — mở link đó là thấy ứng dụng.']
  }
  const sampleTitles = x.sampleCode || []
  const code = (cd.code || []).filter((cb) => !sampleTitles.includes(cb.title)).map((cb) => ({ ...cb, note: (x.codeNote || {})[cb.title] || '' }))
  const samples = (cd.code || []).filter((cb) => sampleTitles.includes(cb.title))
  const apply = {
    title: 'Tự áp dụng',
    intro: x.applyIntro || '',
    fit: x.fit || { yes: [], no: [] },
    prep, prepPrompt,
    steps: texts(howto.steps), stepSections, code,
    refTables: byRole('apply'),
    success, samples,
    pitfalls: texts(howto.pitfalls).map(pitfallRow), pitfallTable,
  }
  apply.empty = !apply.intro && !apply.fit.yes.length && !apply.fit.no.length && !prep.length && !apply.steps.length && !stepSections.length && !code.length && !apply.refTables.length && !success.length && !apply.pitfalls.length && !pitfallTable

  const sec = gsec('security')
  const roadmap = gsec('roadmap')
  const limits = x.limits ? pick(next, x.limits) : next
  const nextSteps = x.nextSteps ? pick(next, x.nextSteps) : []

  const ba = x.beforeAfter || (() => {
    const tb = byRole('beforeAfter')[0]
    return tb ? { cols: x.beforeAfterCols || tb.cols, rows: tb.rows, note: tb.note } : null
  })()

  return {
    hero: {
      type: x.type ? TYPE_LABEL[x.type] : '',
      status: STATUS_LABEL[statusOf(c.id)] || '',
      statusNote: cd.statusNote || '',
      toolName: x.toolName || '',
      audience: cd.audience || '',
      difficulty: cd.difficulty || '',
      access: x.access || '',
      tools: c.tools || [],
      owner: info.name,
      ownerTeam: c.team || info.role,
      updated: c.submitted ? fmtDate(c.updatedAt || c.publishedAt) : '',
    },
    stats: cd.stats || [],
    tldr: x.tldr || (c.submitted ? [
      ['Vấn đề', cd.problem ? String(cd.problem).split(/(?<=[.!?])\s/)[0] : ''],
      ['Giải pháp', firstLine(cd.solution)],
      ['Kết quả', firstLine(cd.result)],
    ].filter((r) => r[1]) : []),
    problem: { text: cd.problem || '', bullets: cd.pain || [], tables: byRole('problem'), images: [] },
    solution: { analogy: x.analogy || (guide && guide.sections[0]?.blocks.find((b) => b.type === 'note' && b.title === 'Hiểu đơn giản')?.text) || '', steps: cd.solution || [], images: [] },
    result: { bullets: cd.result || [], beforeAfter: ba, tables: byRole('result'), note: x.measureNote || '', images: [] },
    apply: { ...apply, blocks: [], images: [] },
    safety: { rules: sec ? sec.blocks[0].items : texts(howto.security), limits, tables: byRole('safety') },
    demo: (cd.gallery || []).filter((g) => g.src),
    // Built-ins link a code repo (dev detail); a submission's link is the author's source document.
    tech: { bullets: [], code: [], images: [], tables: byRole('tech'), repo: c.repoHref && !c.submitted ? { label: c.repo || c.repoHref, href: c.repoHref } : null },
    next: { steps: roadmap ? roadmap.blocks[0].items : nextSteps, contact: texts(howto.contact), link: c.submitted && c.repoHref ? c.repoHref : '' },
  }
}
