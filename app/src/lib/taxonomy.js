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
