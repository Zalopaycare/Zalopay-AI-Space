// Reads the Word template people download from "Chia sẻ use case" (public/templates/…docx) and
// turns it back into form values. Runs in the browser with no extra library: a .docx is a zip,
// so we find word/document.xml, inflate it with DecompressionStream and walk its paragraphs.
// The headings must match tools/make_usecase_template.py.

export const TEMPLATE_URL = '/templates/Mau-chia-se-use-case-Zalopay-AI-Space.docx'

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[*:]/g, '').replace(/\s+/g, ' ').trim()

// heading (as written in the template) -> form key
const FIELDS = [
  ['Tên use case', 'title'], ['Dành cho ai', 'audience'], ['Team / Nhóm', 'team'],
  ['Người thực hiện', 'kind'], ['Trạng thái', 'status'], ['Độ khó', 'level'],
  ['Category', 'category'], ['Topic', 'topics'], ['Công cụ AI', 'tools'],
  ['Vấn đề / Bối cảnh', 'problem'], ['Giải pháp / Cách làm', 'solution'], ['Cần chuẩn bị gì', 'prep'],
  ['Prompt / Quy trình', 'prompt'], ['Kết quả / Tác động', 'result'], ['Giới hạn & lưu ý', 'limits'],
  ['Link tài liệu / repo', 'link'], ['Người liên hệ (PIC)', 'contact'],
]
const SECTION_TITLES = ['thong tin chung', 'noi dung', 'mau chia se use case — zalopay ai space', 'mau chia se use case - zalopay ai space']
const byHeading = new Map(FIELDS.map(([h, k]) => [fold(h), k]))

// ---- minimal zip reader (central directory -> one entry) ----
async function readZipEntry(buf, name) {
  const dv = new DataView(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('not_zip')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const fname = dec.decode(new Uint8Array(buf, p + 46, nlen))
    if (fname === name) {
      const lnlen = dv.getUint16(local + 26, true), lxlen = dv.getUint16(local + 28, true)
      const data = new Uint8Array(buf, local + 30 + lnlen + lxlen, csize)
      if (method === 0) return dec.decode(data)
      if (method !== 8) throw new Error('zip_method')
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return await new Response(stream).text()
    }
    p += 46 + nlen + xlen + clen
  }
  throw new Error('no_document')
}

/** Paragraph texts from word/document.xml, in order (tables flattened row by row). */
function paragraphs(xml) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(doc.getElementsByTagNameNS(W, 'p')).map((p) => {
    let text = ''
    for (const el of p.getElementsByTagNameNS(W, '*')) {
      if (el.localName === 't') text += el.textContent
      else if (el.localName === 'tab') text += '\t'
      else if (el.localName === 'br' || el.localName === 'cr') text += '\n'
    }
    const style = p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') || p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttribute('w:val') || ''
    return { text: text.replace(/ /g, ' '), style }
  })
}

const isGuide = (para) => /^guide$/i.test(para.style) || /^\s*hướng dẫn\s*:/i.test(para.text)
const isExample = (t) => /^\s*ví dụ\s*:/i.test(t)
const split = (t) => t.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)

/**
 * Parse an uploaded .docx (File) into { form, kind, status, level, category[], topics[], tools[], filled[], missing[] }.
 * `options` = { cats, kinds, statuses, levels } to snap choice answers to the form's exact values.
 */
export async function parseUseCaseDocx(file, options) {
  if (!/\.docx$/i.test(file.name)) throw new Error('not_docx')
  const xml = await readZipEntry(await file.arrayBuffer(), 'word/document.xml')
  const values = {}
  let key = null
  for (const para of paragraphs(xml)) {
    const text = para.text.trim()
    const h = fold(text.replace(/\s*\*\s*$/, ''))
    if (byHeading.has(h)) { key = byHeading.get(h); values[key] = values[key] || []; continue }
    if (SECTION_TITLES.includes(h) || /^cach dung/.test(h)) { key = null; continue }
    if (!key || isGuide(para) || !text || isExample(text)) continue
    values[key].push(para.text.replace(/\s+$/, ''))
  }
  const val = (k) => (values[k] || []).join('\n').trim()
  const snap = (answer, list) => {
    const a = fold(answer)
    return list.find((x) => fold(x) === a) || list.find((x) => a && (fold(x).includes(a) || a.includes(fold(x)))) || ''
  }
  const form = {}
  for (const k of ['title', 'audience', 'team', 'problem', 'solution', 'prep', 'prompt', 'result', 'limits', 'link', 'contact']) form[k] = val(k)
  form.title = form.title.split('\n')[0]
  form.audience = form.audience.replace(/\n+/g, ', ')
  form.team = form.team.replace(/\n+/g, ', ')
  form.link = form.link.split(/\s+/)[0] || ''
  const out = {
    form,
    kind: snap(val('kind'), options.kinds),
    status: snap(val('status'), options.statuses),
    level: snap(val('level'), options.levels),
    category: split(val('category')).map((c) => snap(c, options.cats)).filter((c, i, a) => c && a.indexOf(c) === i),
    topics: split(val('topics')),
    tools: split(val('tools')),
  }
  const labels = Object.fromEntries(FIELDS.map(([h, k]) => [k, h]))
  const has = (k) => (k in form ? !!form[k] : k === 'category' ? out.category.length > 0 : !!out[k])
  const required = ['title', 'audience', 'team', 'kind', 'status', 'level', 'category', 'problem', 'solution', 'prep', 'prompt', 'result']
  out.missing = required.filter((k) => !has(k)).map((k) => labels[k])
  out.filled = FIELDS.map(([, k]) => k).filter(has).length
  return out
}
