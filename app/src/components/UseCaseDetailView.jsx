import { css } from '../lib/style.js'
import { Section, ProblemSolution, ApplySection, BulletList, PlainTable, Images, NoInfo } from './UseCaseDetailParts.jsx'

// The body of a use case detail page (parts 2–7 of the template; technical details are left out), shared by the real page and the
// share form's "Xem trước" so both look identical. Parts with no data are hidden and the rest are
// numbered in the order shown (no "6 → 8" gaps).

/** Which parts have data, their running numbers, and the matching TOC entries. `showEmpty` (an AI
 *  Exhibition booth nobody has written up yet) keeps the main parts, marked "Chưa có thông tin". */
export function detailLayout(tp, t, showEmpty = false) {
  const has = {
    tldr: tp.tldr.length > 0,
    ps: !!(tp.problem.text || tp.problem.bullets.length || tp.solution.text || tp.solution.steps.length),
    // Kết quả belongs to Giải pháp: it shows inside that card, not as a part of its own
    result: !!((tp.result.highlights || []).length || tp.result.bullets.length || tp.result.beforeAfter || tp.result.tables.length || tp.result.note || tp.result.images.length),
    apply: !tp.apply.empty,
    safety: !!(tp.safety.rules.length || tp.safety.limits.length || tp.safety.tables.length),
    demo: tp.demo.length > 0,
  }
  // "Tự áp dụng" comes before "Kết quả": once the reader gets the idea, the links and steps are next.
  const parts = [
    ['tldr', 'uc-tldr', 'Tóm tắt'],
    ['ps', 'uc-problem', 'Bài toán & giải pháp'],
    ['apply', 'uc-apply', tp.apply.title],
    ['safety', 'uc-safety', 'An toàn & giới hạn'],
    ['demo', 'uc-demo', 'Demo'],
  ].filter(([k]) => has[k] || (k === 'ps' && has.result) || (showEmpty && ['ps', 'apply', 'safety'].includes(k)))
  const num = {}
  parts.forEach(([k], i) => { num[k] = String(i + 1) })
  const toc = parts.map(([k, id, label]) => ({ id, label: num[k] + '. ' + t(label), hot: k === 'apply' }))
  return { has, num, toc, showEmpty }
}

// same as the card headings in UseCaseDetailParts (SUB)
const SUBHEAD = 'font-size:16px; font-weight:800; letter-spacing:-.2px; color:#1D3A8F; margin-bottom:10px;'

export function DetailSections({ id, tp, t, layout }) {
  const { has, num, showEmpty } = layout
  return (
    <>
      {(has.ps || has.result || showEmpty) && <ProblemSolution t={t} problem={tp.problem} solution={tp.solution} result={has.result ? tp.result : null} showEmpty={showEmpty} num={num.ps} />}
      {has.apply && <ApplySection id={id} a={tp.apply} t={t} num={num.apply} />}
      {!has.apply && showEmpty && <Section id="uc-apply" num={num.apply} title={t(tp.apply.title)}><NoInfo t={t} /></Section>}
      {!has.safety && showEmpty && <Section id="uc-safety" num={num.safety} title={t('An toàn & giới hạn')}><NoInfo t={t} /></Section>}
      {has.safety && (
        <Section id="uc-safety" num={num.safety} title={t('An toàn & giới hạn')}>
          <div style={css('display:flex; flex-direction:column; gap:16px;')}>
            {tp.safety.rules.length > 0 && <div><div style={css(SUBHEAD)}>{t('Nguyên tắc an toàn')}</div><BulletList items={tp.safety.rules} dot="#6F0CE2" /></div>}
            {tp.safety.limits.length > 0 && <div><div style={css(SUBHEAD)}>{t('Hiện chưa làm được')}</div><BulletList items={tp.safety.limits} dot="#E39100" /></div>}
            {tp.safety.tables.map((tb, i) => <PlainTable flat key={i} table={tb} />)}
          </div>
        </Section>
      )}
      {has.demo && (
        <Section id="uc-demo" num={num.demo} title="Demo">
          <Images images={tp.demo} style={{ marginTop: 0 }} />
        </Section>
      )}
    </>
  )
}
