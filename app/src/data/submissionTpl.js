// Turns a share-form submission (the original columns + its `extra` JSON) into the 9-part template
// shape that fromTpl() in useCaseTemplate.js renders — the same one the showcase cases use. The
// share form's "Xem trước" goes through here too, so the preview is exactly the published page.

const lines = (t) => String(t || '').split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean)
const firstSentence = (t) => (String(t || '').trim().split(/(?<=[.!?])\s|\n/)[0] || '').trim()
const STATUS = { 'Ý tưởng': 'planning', Prototype: 'prototype', 'Đang dùng thật': 'inuse' }
const fmt = (raw) => {
  const d = raw ? new Date(String(raw).replace(' ', 'T') + (/[zZ+]/.test(String(raw)) ? '' : 'Z')) : new Date()
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** s = submission as the API returns it (title, problem, …, extra: { type, oneLine, highlights, fitYes, fitNo, pitfalls, tech }). */
export function submissionTpl(s) {
  const e = s.extra || {}
  const hl = (e.highlights || []).filter((h) => h && (h.value || h.label))
  const resultLines = lines(s.result)
  return {
    type: e.type || '',
    status: STATUS[s.status] || '',
    audience: s.audience || '',
    difficulty: s.level || '',
    ownerName: s.author || '',
    ownerTeam: s.team || '',
    updated: fmt(s.publishedAt || s.time),
    tldr: [
      ['Vấn đề', firstSentence(s.problem)],
      ['Giải pháp', e.oneLine || lines(s.solution)[0] || ''],
      ['Kết quả', hl[0] ? [hl[0].value, hl[0].label].filter(Boolean).join(' ') : resultLines[0] || ''],
    ],
    problem: { text: s.problem || '' },
    solution: { steps: lines(s.solution) },
    result: { highlights: hl, bullets: resultLines },
    apply: {
      fit: { yes: lines(e.fitYes), no: lines(e.fitNo) },
      prep: lines(s.prep),
      blocks: s.prompt ? [{ type: 'prompt', label: 'Prompt / quy trình', text: s.prompt }] : [],
      // "Lỗi bạn gặp → cách xử lý", one per line
      pitfalls: lines(e.pitfalls).map((l) => { const m = /^(.*?)\s*(?:→|->|—)\s*(.+)$/.exec(l); return m ? { meet: m[1], why: '', fix: m[2] } : { meet: l, why: '' } }),
    },
    safety: { limits: lines(s.limits) },
    tech: { bullets: lines(e.tech) },
    next: { contact: s.contact ? [s.contact] : [], link: s.link || '' },
  }
}

/** Card/one-line description: the author's "Mô tả 1 câu" when given. */
export const submissionDesc = (s) => (s.extra && s.extra.oneLine) || ''
