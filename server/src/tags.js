// Tag lists (category / topics / tools) as stored: trimmed strings, at most 12, and never text that
// arrived with a broken encoding (U+FFFD "�"), which would show as "T�i li�u" everywhere.
export const tagList = (a) => (Array.isArray(a) ? a : [])
  .map((x) => String(x ?? '').trim().slice(0, 60))
  .filter((x) => x && !x.includes('�'))
  .slice(0, 12)
