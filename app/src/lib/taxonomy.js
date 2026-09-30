// One list of AI tools for every form, filter and tag, so names match everywhere.
export const OTHER = 'Khác'
export const AI_TOOLS = ['Claude', 'ChatGPT', 'Gemini', 'Copilot', 'Cursor', 'Codex', 'Perplexity', 'Kling', 'Magnify']

const ALIASES = { gpt: 'ChatGPT', chatgpt: 'ChatGPT', openai: 'ChatGPT', 'chat gpt': 'ChatGPT', other: OTHER, 'github copilot': 'Copilot', 'microsoft copilot': 'Copilot' }

/** Canonical tool name: "GPT" / "gpt" / "Chat GPT" → "ChatGPT", "Other" → "Khác", known tools in their usual casing. */
export function normalizeTool(name) {
  const raw = String(name || '').trim()
  const key = raw.toLowerCase()
  if (ALIASES[key]) return ALIASES[key]
  return AI_TOOLS.find((t) => t.toLowerCase() === key) || raw
}

export const normalizeTools = (list) => Array.from(new Set((list || []).map(normalizeTool).filter(Boolean)))
