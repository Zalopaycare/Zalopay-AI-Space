import { hlList, statusOf } from './useCases.js'

// Shapes every use case into the 9-part "Template trình bày Use Case" (Zalopay AI Space, 30/09/2026):
//   hero fields · 1 Tóm tắt 30 giây · 2 Bài toán · 3 Giải pháp · 4 Kết quả · 5 Tự áp dụng
//   6 An toàn & giới hạn · 7 Demo · 8 Chi tiết kỹ thuật · 9 Tiếp theo & liên hệ
// Built-in cases get their template-only fields from EXTRA below (all taken from the source docs
// already in useCases.js — nothing new is claimed). Parts with no data come back empty and are hidden.

export const TYPE_LABEL = { tool: 'Công cụ dùng ngay', guide: 'Hướng dẫn', case: 'Case study', proposal: 'Đề xuất' }
export const STATUS_LABEL = { inuse: 'Đang dùng', pilot: 'Thử nghiệm', prototype: 'Thử nghiệm', building: 'Đang làm', planning: 'Ý tưởng' }

// Where each source table belongs in the template: problem · result · apply · safety · tech.
const EXTRA = {
  c1: {
    type: 'case',
    access: 'Chỉ trong team QE — muốn thử thì hỏi trong kênh AI Hub',
    tldr: [
      ['Vấn đề', 'Sau mỗi lần sửa app, QC phải bấm tay lại cùng một chuỗi thao tác trên điện thoại.'],
      ['Giải pháp', 'QC bấm mẫu một lần; máy ghi lại rồi tự bấm lại trên điện thoại thật, so ảnh màn hình trước mỗi bước.'],
      ['Kết quả', 'Bản thử nghiệm đã chạy nhiều kịch bản liên tiếp, quay video và xuất báo cáo lỗi. Chưa đo thời gian tiết kiệm.'],
      ['Dùng khi', 'Bạn có kịch bản kiểm thử app Android phải chạy lại sau mỗi bản build.'],
    ],
    analogy: 'Như một người quay lại thao tác của bạn rồi tự làm lại y hệt, nhưng luôn nhìn màn hình trước khi bấm.',
    fit: {
      yes: ['Bạn là QC/QE team mobile, phải kiểm thử lại app Android sau mỗi bản build.'],
      no: ['Bạn cần chạy trên nhiều dòng máy, nhiều kích thước màn hình hoặc cử chỉ phức tạp — bản thử nghiệm chưa hỗ trợ.'],
    },
    tableRole: { 'Công việc của QC và phần hệ thống hỗ trợ': 'beforeAfter', 'Luồng hoạt động': 'tech' },
    beforeAfterCols: ['Trước: QC làm tay', 'Sau: hệ thống hỗ trợ'],
    measureNote: 'Chưa đo bằng số. Dự kiến chạy thử thực tế rồi so thời gian chuẩn bị, chạy và tìm lỗi trên cùng một tập kịch bản.',
    limits: [0, 1],
    nextSteps: [2],
  },
  c2: {
    type: 'tool',
    toolName: 'us-hive',
    access: 'Cần xin quyền repo aqr/bill/us-hive — nhắn NamNTH',
    tldr: [
      ['Vấn đề', 'Mỗi người tự cài công cụ và tự đặt cách làm việc với AI, nên cùng một yêu cầu ra chất lượng khác nhau.'],
      ['Giải pháp', 'Một lệnh cài bộ 7 trợ lý dùng chung cho Claude Code, Cursor và Codex.'],
      ['Kết quả', 'Cả team có cùng bộ lệnh, cùng quy trình và tiêu chuẩn kỹ thuật. Chưa có số đo.'],
      ['Dùng khi', 'Bạn là developer và muốn AI làm theo chuẩn chung của team.'],
    ],
    analogy: 'Như một cuốn sổ tay quy trình cài thẳng vào công cụ AI: ai trong team gọi cũng ra cùng một cách làm.',
    fit: {
      yes: ['Bạn là developer dùng Claude Code, Cursor hoặc Codex.', 'Team bạn muốn AI làm theo cùng quy trình và tiêu chuẩn kỹ thuật.'],
      no: ['Bạn không dùng Git và terminal — bộ này dành cho developer.'],
    },
    tableRole: { 'Danh sách trợ lý': 'apply', 'Vấn đề đang gặp': 'problem' },
    codeNote: { INSTALL: 'Lệnh này tải us-hive về máy và cài trợ lý cho cả ba công cụ.', 'GỌI AGENT': 'Lệnh này gọi một trợ lý ngay trong công cụ AI của bạn.' },
    measureNote: 'Chưa đo bằng số.',
    limits: [0, 1],
    nextSteps: [],
  },
  c3: {
    type: 'case',
    access: 'Mở cho mọi người — báo cáo đọc được ngay',
    tldr: [
      ['Vấn đề', 'Người làm nghiệp vụ nhập sai thiết lập chiến dịch khuyến mãi mà không có cách tự kiểm tra trước.'],
      ['Giải pháp', 'Rà 1.881 yêu cầu hỗ trợ và phân loại theo nguyên nhân gốc, để biết chỗ nào nên chặn lỗi trước.'],
      ['Kết quả', '289 yêu cầu (15,4%) do cấu hình sai; riêng sai ứng dụng / kênh áp dụng chiếm 36,1% nhóm này.'],
      ['Dùng khi', 'Bạn cấu hình, hoặc hỗ trợ người cấu hình, campaign khuyến mãi trong CRM tool.'],
    ],
    applyIntro: 'Không cần cài gì — đây là báo cáo phân tích, đọc để biết nên soát lại chỗ nào trước khi bật campaign.',
    fit: {
      yes: ['Bạn đang cấu hình campaign khuyến mãi trong CRM tool, hoặc đang hỗ trợ người cấu hình.'],
      no: ['Bạn cần số liệu về công cụ sự kiện hoặc phần gợi ý hành động tiếp theo — nằm ngoài phạm vi.'],
    },
    noPrep: true,
    tableRole: { 'Phân bổ nguyên nhân gốc': 'result', 'Bóc tách nhóm "người cấu hình sai"': 'result', 'Phạm vi': 'safety' },
    measureNote: 'Chưa đo mức giảm lỗi sau khi có giải pháp. Mốc để so sánh: 289 yêu cầu trong 7 tháng.',
    limits: [0, 1, 2],
    nextSteps: [],
  },
  c4: {
    type: 'guide',
    toolName: 'Zalopay Agent Base Skills',
    access: 'Cần file cấu hình do SRE (HienLQ) cấp riêng',
    tldr: [
      ['Vấn đề', 'Người không rành kỹ thuật muốn đưa trợ lý AI lên chạy thật nhưng luôn phải nhờ người kỹ thuật.'],
      ['Giải pháp', 'Cài bộ skill vào công cụ AI, rồi ra lệnh bằng tiếng Việt để AI tự deploy.'],
      ['Kết quả', 'Nhận về một đường link chạy thật, mở bằng trình duyệt và gửi được cho người khác.'],
      ['Dùng khi', 'Bạn có một ứng dụng hoặc agent chạy trên máy và muốn người khác dùng được.'],
    ],
    fit: {
      yes: ['Bạn chưa rành kỹ thuật nhưng muốn tự đưa AI agent của mình lên chạy thật.', 'Bạn dùng Claude Code, Codex hoặc Cursor.'],
      no: ['Bạn cần chạy model local như ollama, vllm — mỗi ứng dụng giới hạn 2 CPU / 4 GB RAM.', 'Bạn cần môi trường production — hiện mới có môi trường dev.'],
    },
    limits: [0, 1],
    nextSteps: [],
  },
  c5: {
    type: 'tool',
    toolName: 'zlpws-admin-mcp',
    access: 'Cần quyền đăng bài trên trang quản trị website — xin LuanNA hoặc team CMS',
    tldr: [
      ['Vấn đề', 'Thuê agency viết bài tốn hơn 300k và 2–3 ngày mỗi bài.'],
      ['Giải pháp', 'Trợ lý AI tự viết và đăng bài lên trang quản trị; người vận hành chỉ ra yêu cầu và duyệt.'],
      ['Kết quả', 'Bài AI viết được chấm "giống người viết" ngang bài agency (đo trên 1–2 bài).'],
      ['Dùng khi', 'Bạn cần lên bài tin tức, blog cho website Zalopay.'],
    ],
    analogy: 'Như có một người viết bài trực sẵn trong trang quản trị: bạn giao đề bài, đọc lại, rồi bấm đăng.',
    fit: {
      yes: ['Bạn vận hành hoặc lên bài tin tức, blog cho website Zalopay.'],
      no: ['Bạn cần tối ưu tìm kiếm (SEO) hoặc loại nội dung khác ngoài tin tức, blog — chưa hỗ trợ.'],
    },
    tableRole: { 'Vì sao cần làm': 'problem', 'Cách đo kết quả': 'result', 'Phạm vi': 'safety' },
    beforeAfter: {
      cols: ['Chỉ số', 'Trước', 'Sau', 'Đo trên'],
      rows: [
        ['Điểm "giống người viết"', 'Mốc: bài agency đang đăng', 'Ngang bài agency', '1–2 bài'],
        ['Chi phí mỗi bài', 'Hơn 300k (agency)', 'Chưa đo', '—'],
        ['Thời gian lên một bài', '2–3 ngày', 'Chưa đo', '—'],
      ],
    },
    codeNote: { INSTALL: 'Lệnh này thêm kho plugin nội bộ và cài bộ kết nối vào Codex.' },
    sampleCode: ['OUTPUT'],
    limits: [],
    nextSteps: [0, 1, 2],
  },
}

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
      tools: c.tools || [], owner: m.ownerName || c.author, ownerTeam: m.ownerTeam || '', updated: m.updated || '[cần bổ sung]',
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
