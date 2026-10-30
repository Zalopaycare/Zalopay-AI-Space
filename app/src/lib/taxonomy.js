// One list of AI tools for every form, filter and tag, so names match everywhere.
export const OTHER = 'Khác'
export const AI_TOOLS = ['Claude', 'ChatGPT', 'Gemini', 'Copilot', 'Cursor', 'Codex', 'Perplexity', 'Kling', 'Magnify']

const ALIASES = { gpt: 'ChatGPT', chatgpt: 'ChatGPT', openai: 'ChatGPT', 'chat gpt': 'ChatGPT', other: OTHER, 'github copilot': 'Copilot', 'microsoft copilot': 'Copilot' }

/** Canonical tool name: "GPT" / "gpt" / "Chat GPT" → "ChatGPT", "Other" → "Khác", known tools in their usual casing. */
export function normalizeTool(name) {
  const raw = repairLabel(name)
  const key = raw.toLowerCase()
  if (ALIASES[key]) return ALIASES[key]
  return AI_TOOLS.find((t) => t.toLowerCase() === key) || raw
}

export const normalizeTools = (list) => Array.from(new Set((list || []).map(normalizeTool).filter(Boolean)))

/** Short tool name for filters: a product line under one name ("Claude Code" → "Claude"); others as they are. */
export function toolGroup(name) {
  const n = normalizeTool(name)
  return AI_TOOLS.find((t) => n.toLowerCase() === t.toLowerCase() || n.toLowerCase().startsWith(t.toLowerCase() + ' ')) || n
}

// The share form's categories. Built-in cases and AI Exhibition booths carry their own labels
// (Engineering, Operations, Test Automation…); each is filed under one of these for the Library filter.
export const CATEGORIES = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const CATEGORY_OF = {
  engineering: 'Coding & Technical', 'software development': 'Coding & Technical', 'test automation': 'Coding & Technical', security: 'Coding & Technical',
  operations: 'Automation & Workflow', 'config & operations automation': 'Automation & Workflow',
  data: 'Data & Analysis', 'data analytics & monitoring': 'Data & Analysis',
  marketing: 'Content & Communication', 'docs, content & design': 'Content & Communication',
  'chatbot & knowledge search': 'Research & Knowledge', product: 'Productivity & Personal Work', khác: 'Other',
}
/** One of CATEGORIES for whatever a use case or booth is labelled with ("Other" when nothing fits). */
export function categoryOf(raw) {
  const v = repairLabel(Array.isArray(raw) ? raw[0] : raw)
  const key = v.toLowerCase()
  return CATEGORIES.find((c) => c.toLowerCase() === key) || CATEGORY_OF[key] || 'Other'
}

// Every built-in tag label, for repairing ones saved with a broken encoding ("T�i li�u d�i").
const KNOWN_LABELS = [
  'Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo', 'Tự động hoá',
  'Coding & Technical', 'Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis',
  'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other', OTHER, ...AI_TOOLS,
]
const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A tag as it should read: "T�i li�u d�i" → "Tài liệu dài" when it matches a built-in tag; otherwise unchanged (or dropped if unreadable). */
export function repairLabel(label) {
  const raw = String(label || '').trim()
  if (!raw.includes('\uFFFD')) return raw
  const re = new RegExp('^' + raw.split(/\uFFFD+/).map(escapeRe).join('.{1,3}') + '$', 'u')
  return KNOWN_LABELS.find((k) => re.test(k.normalize('NFC'))) || ''
}
export const repairLabels = (list) => Array.from(new Set((list || []).map(repairLabel).filter(Boolean)))
