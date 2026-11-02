// Bold and italic inside the share form's text: stored in the text as **bold**, *italic* and
// ***both*** (a literal star is \*), so every place that keeps or reads the plain string still works.
// The form edits it as formatted text (RichArea) and the use case page shows it formatted (Fill), so
// nobody ever sees or types the stars.

const TOKEN = /(\\\*|\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|\*[^*\s](?:[^*\n]*?[^*\s])?\*)/g

/** The text as runs: [{ text, b, i }]. */
export function parseInline(s) {
  const out = []
  String(s ?? '').split(TOKEN).forEach((p, k) => {
    if (!p) return
    if (!(k % 2)) out.push({ text: p, b: false, i: false })
    else if (p === '\\*') out.push({ text: '*', b: false, i: false })
    else if (p.startsWith('***')) out.push({ text: p.slice(3, -3), b: true, i: true })
    else if (p.startsWith('**')) out.push({ text: p.slice(2, -2), b: true, i: false })
    else out.push({ text: p.slice(1, -1), b: false, i: true })
  })
  return out
}

export const hasInline = (s) => /\*/.test(String(s ?? ''))

/** The words without the marks (titles, one-line summaries, alt text). */
export const stripInline = (s) => parseInline(s).map((r) => r.text).join('')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Stored text → the editor's HTML (<b>, <i>, <br>). */
export function inlineToHtml(s) {
  const html = parseInline(s).map((r) => {
    let h = esc(r.text).replace(/\n/g, '<br>')
    if (r.i) h = `<i>${h}</i>`
    if (r.b) h = `<b>${h}</b>`
    return h
  }).join('')
  // a trailing line break needs a second <br> to show as an empty last line
  return /\n$/.test(String(s ?? '')) ? html + '<br>' : html
}

const BLOCK = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL)$/
/** The editor's DOM → stored text. */
export function nodeToInline(root) {
  const runs = []
  const push = (text, b, i) => { if (text) runs.push({ text, b, i }) }
  const walk = (node, b, i) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { push(n.nodeValue.replace(/ /g, ' '), b, i); return }
      if (n.nodeType !== 1) return
      const tag = n.tagName
      if (tag === 'BR') { push('\n', false, false); return }
      const st = n.style || {}
      const nb = b || tag === 'B' || tag === 'STRONG' || st.fontWeight === 'bold' || Number(st.fontWeight) >= 600
      const ni = i || tag === 'I' || tag === 'EM' || st.fontStyle === 'italic'
      // a new block (pasted or made by the browser) starts on a new line
      if (BLOCK.test(tag) && runs.length && !runs[runs.length - 1].text.endsWith('\n')) push('\n', false, false)
      walk(n, nb, ni)
    })
  }
  walk(root, false, false)
  let out = ''
  for (const r of runs) {
    // marks never span a line break, and spaces stay outside them (so "*x*" always reads back)
    r.text.split(/(\n)/).forEach((seg) => {
      if (seg === '\n') { out += '\n'; return }
      const body = seg.replace(/\*/g, '\\*')
      if (!(r.b || r.i) || !seg.trim()) { out += body; return }
      const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(body)
      const m = r.b && r.i ? '***' : r.b ? '**' : '*'
      out += lead + m + core + m + trail
    })
  }
  // the last <br> only holds the caret's line open (inlineToHtml adds it for a trailing line break)
  return out.endsWith('\n') ? out.slice(0, -1) : out
}
