import { hlList, statusOf } from './useCases.js'

// Shapes every use case into the 9-part "Template trình bày Use Case" (Zalopay AI Space, 30/09/2026):
//   hero fields · 1 Tóm tắt 30 giây · 2 Bài toán · 3 Giải pháp · 4 Kết quả · 5 Tự áp dụng
//   6 An toàn & giới hạn · 7 Demo · 8 Chi tiết kỹ thuật · 9 Tiếp theo & liên hệ
// Built-in cases get their template-only fields from EXTRA below (all taken from the source docs
// already in useCases.js — nothing new is claimed). Parts with no data come back empty and are hidden.

export const TYPE_LABEL = { tool: 'Công cụ dùng ngay', guide: 'Hướng dẫn', case: 'Case study', proposal: 'Đề xuất' }
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
  const p = m.problem || {}, so = m.solution || {}, r = m.result || {}, a = m.apply || {}, sa = m.safety || {}, te = m.tech || {}, n = m.next || {}
  // The template asks every tool/guide for these; if the source doc has none, say so rather than hide it.
  const pit = arr(a.pitfalls).map((x) => (typeof x === 'string' ? pitfallRow(x) : x))
  if (!pit.length && m.type !== 'proposal') pit.push({ meet: '[cần bổ sung]', why: '' })
  const apply = {
    title: m.type === 'case' ? 'Mang ý tưởng về team bạn' : m.type === 'proposal' ? 'Muốn thử nghiệm cùng?' : 'Tự áp dụng',
    intro: a.intro || '', fit: { yes: arr(a.fit?.yes), no: arr(a.fit?.no) },
    promptTarget: m.promptTarget || (c.tools || []).join(' / '),
    prep: arr(a.prep), prepPrompt: a.prepPrompt || null,
    steps: arr(a.steps), stepSections: [], blocks: arr(a.blocks), code: arr(a.code), refTables: arr(a.refTables),
    success: arr(a.success), samples: arr(a.samples), images: arr(a.images),
    pitfalls: pit, pitfallTable: null,
  }
  apply.empty = !apply.intro && !apply.fit.yes.length && !apply.fit.no.length && !apply.prep.length && !apply.steps.length && !apply.blocks.length && !apply.code.length && !apply.refTables.length && !apply.success.length && !apply.images.length && !pit.length
  return {
    hero: {
      type: TYPE_LABEL[m.type] || '', status: STATUS_LABEL[m.status] || '', statusNote: m.statusNote || '',
      toolName: m.toolName || '', audience: m.audience || '', difficulty: m.difficulty || '', access: m.access || '',
      tools: c.tools || [], owner: String(m.ownerName || c.author).replace(/\s*\(\d+\)/g, ''), // drop Microsoft's "(8)" counters, ownerTeam: m.ownerTeam || '', updated: m.updated || '[cần bổ sung]',
    },
    stats: arr(m.stats).slice(0, 3),
    tldr: arr(m.tldr).filter((row) => row && row[1]),
    problem: { text: p.text || '', bullets: arr(p.bullets), tables: arr(p.tables), images: arr(p.images) },
    solution: { analogy: so.analogy || '', steps: arr(so.steps), images: arr(so.images) },
    result: { bullets: arr(r.bullets), beforeAfter: r.beforeAfter && arr(r.beforeAfter.rows).length ? r.beforeAfter : null, tables: arr(r.tables), note: r.note || '', images: arr(r.images) },
    apply,
    safety: { rules: arr(sa.rules), limits: arr(sa.limits), tables: arr(sa.tables) },
    demo: arr(m.demo).filter((g) => g && g.src),
    tech: { bullets: arr(te.bullets), tables: arr(te.tables), code: arr(te.code), images: arr(te.images), repo: te.repo && te.repo.label ? te.repo : null },
    next: { steps: arr(n.steps), contact: arr(n.contact), link: n.link || '' },
  }
}

export function buildTemplate(c, cd, info) {
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
    title: x.type === 'case' ? 'Mang ý tưởng về team bạn' : x.type === 'proposal' ? 'Muốn thử nghiệm cùng?' : 'Tự áp dụng',
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
