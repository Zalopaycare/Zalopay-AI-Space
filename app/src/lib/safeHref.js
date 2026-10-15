/** Only http(s) links are ever made clickable: "javascript:…" and other schemes come back null. */
export const safeHref = (url) => {
  const u = String(url || '').trim()
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : null
}
