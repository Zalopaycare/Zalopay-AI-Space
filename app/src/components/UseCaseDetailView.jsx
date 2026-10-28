import { css } from '../lib/style.js'
import Fill, { plainText } from './Fill.jsx'
import { Section, ProblemSolution, ApplySection, BulletList, PlainTable, Images, NoInfo } from './UseCaseDetailParts.jsx'

// The body of a use case detail page (parts 2–7 of the template; technical details are left out), shared by the real page and the
// share form's "Xem trước" so both look identical. Parts with no data are hidden and the rest are
// numbered in the order shown (no "6 → 8" gaps).

/** Which parts have data, their running numbers, and the matching TOC entries. `showEmpty` (an AI
 *  Exhibition booth nobody has written up yet) keeps the main parts, marked "Thông tin đang được cập nhật". */
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
    ['safety', 'uc-safety', 'Trách nhiệm & giới hạn'],
    // the author's own parts ("Phần khác" in the form), each a numbered part of its own
    ...(tp.custom || []).map((x, i) => ['custom' + i, 'uc-more-' + i, x.title]),
    ['demo', 'uc-demo', 'Demo'],
  ].filter(([k]) => has[k] || k.startsWith('custom') || (k === 'ps' && has.result) || (showEmpty && ['ps', 'apply'].includes(k)))
  const num = {}
  parts.forEach(([k], i) => { num[k] = String(i + 1) })
  const toc = parts.map(([k, id, label]) => ({ id, label: num[k] + '. ' + t(label), hot: k === 'apply' }))
  return { has, num, toc, showEmpty }
}

// same as the card headings in UseCaseDetailParts (SUB)
const SUBHEAD = 'font-size:16px; font-weight:800; letter-spacing:-.2px; color:#2c5fff; margin-bottom:10px;'
// "Dữ liệu (nào) đi qua AI: …" lines, from either list, are shown on their own
const DATA_LINE = /^\s*Dữ liệu (nào )?đi qua AI\s*:\s*/i
const isDataLine = (x) => DATA_LINE.test(plainText(x))
const dataOf = (x) => String(x).replace(DATA_LINE, '')

export function DetailSections({ id, tp, t, layout }) {
  const { has, num, showEmpty } = layout
  return (
    <>
      {(has.ps || has.result || showEmpty) && <ProblemSolution t={t} problem={tp.problem} solution={tp.solution} result={has.result ? tp.result : null} showEmpty={showEmpty} num={num.ps} />}
      {has.apply && <ApplySection id={id} a={tp.apply} t={t} num={num.apply} />}
      {!has.apply && showEmpty && <Section id="uc-apply" num={num.apply} title={t(tp.apply.title)}><NoInfo t={t} /></Section>}
      {has.safety && (() => {
        const human = tp.safety.rules.filter((x) => !isDataLine(x)), ai = tp.safety.limits.filter((x) => !isDataLine(x))
        const dataLines = [...tp.safety.rules, ...tp.safety.limits].filter(isDataLine).map(dataOf)
        const humanOn = human.length > 0 || tp.safety.tables.length > 0, aiOn = ai.length > 0
        return (
        <Section id="uc-safety" num={num.safety} title={t('Trách nhiệm & giới hạn')}>
          <div style={css('display:flex; flex-direction:column; gap:16px;')}>
            {/* two columns, like Bài toán | Giải pháp; one column when only one of them is filled. Who may
                do what (the role tables) belongs to the people's side. */}
            <div className={humanOn && aiOn ? 'zp-ps2' : undefined}>
              {humanOn && (
                <div style={{ minWidth: 0 }}>
                  <div style={css(SUBHEAD)}>{t('Trách nhiệm của con người')}</div>
                  {human.length > 0 && <BulletList items={human} dot="#6F0CE2" />}
                  {tp.safety.tables.map((tb, i) => <div key={i} style={{ marginTop: human.length ? 14 : 0 }}><PlainTable flat table={tb} /></div>)}
                </div>
              )}
              {aiOn && <div className={humanOn ? 'zp-ps2-sol' : undefined} style={{ minWidth: 0 }}><div style={css(SUBHEAD)}>{t('Giới hạn của AI')}</div><BulletList items={ai} dot="#E39100" /></div>}
            </div>
            {/* "Dữ liệu đi qua AI" is a fact, not a responsibility or a limit: its own line under both */}
            {dataLines.length > 0 && (
              <div style={css('padding:11px 14px; border-radius:12px; background:#F5F8FF; border:1px solid #DCE5FA; font-size:13px; line-height:1.6; color:#3A4757;')}>
                {dataLines.map((d, i) => <div key={i}><b style={css('color:#2c5fff;')}>{t('Dữ liệu đi qua AI')}:</b> <Fill text={d} /></div>)}
              </div>
            )}
          </div>
        </Section>
        )
      })()}
      {(tp.custom || []).map((x, i) => (
        <Section key={'more' + i} id={'uc-more-' + i} num={num['custom' + i]} title={x.title}>
          <div style={css('font-size:13.5px; line-height:1.65; color:#1E293B; white-space:pre-line; overflow-wrap:anywhere;')}><Fill text={x.text} /></div>
        </Section>
      ))}
      {has.demo && (
        <Section id="uc-demo" num={num.demo} title="Demo">
          <Images images={tp.demo} style={{ marginTop: 0 }} />
        </Section>
      )}
    </>
  )
}
