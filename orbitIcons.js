// Ported verbatim from Zalopay AI Space v2.dc.html renderVals() — the 8 AI-tool
// logo tiles that orbit the hero sphere.
function uri(inner) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" ' + inner + '</svg>')
}

const ICON = {
  Claude: uri('viewBox="0 0 100 100"><g stroke="#F5A183" stroke-width="8" stroke-linecap="round"><line x1="50" y1="8" x2="50" y2="92"/><line x1="8" y1="50" x2="92" y2="50"/><line x1="21" y1="21" x2="79" y2="79"/><line x1="79" y1="21" x2="21" y2="79"/></g>'),
  Gemini: uri('viewBox="0 0 100 100"><defs><linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4285F4"/><stop offset="1" stop-color="#9b72f0"/></linearGradient></defs><path d="M50 6 C55 34 66 45 94 50 C66 55 55 66 50 94 C45 66 34 55 6 50 C34 45 45 34 50 6 Z" fill="url(#gem)"/>'),
  OpenAI: uri('viewBox="-50 -50 100 100"><g fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round"><ellipse rx="34" ry="14"/><ellipse rx="34" ry="14" transform="rotate(60)"/><ellipse rx="34" ry="14" transform="rotate(120)"/></g>'),
  Copilot: uri('viewBox="0 0 100 100"><defs><linearGradient id="cp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ED6C6"/><stop offset="1" stop-color="#6E56CF"/></linearGradient></defs><rect x="20" y="32" width="60" height="42" rx="21" fill="url(#cp)"/><circle cx="39" cy="53" r="5.5" fill="#fff"/><circle cx="61" cy="53" r="5.5" fill="#fff"/>'),
  Perplexity: uri('viewBox="0 0 100 100"><g stroke="#7FD8E0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="30"/><line x1="50" y1="14" x2="50" y2="86"/><path d="M50 33 L28 45 M50 33 L72 45 M50 67 L28 55 M50 67 L72 55"/></g>'),
  Kling: uri('viewBox="0 0 100 100"><defs><linearGradient id="kl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5e9c"/><stop offset=".5" stop-color="#ffb14e"/><stop offset="1" stop-color="#6b8cff"/></linearGradient></defs><circle cx="50" cy="50" r="30" fill="none" stroke="url(#kl)" stroke-width="13" stroke-linecap="round" stroke-dasharray="150 60" transform="rotate(-40 50 50)"/>'),
  Google: uri('viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.2z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9h-7.3v5.7C7.9 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-3 .7-4.3v-5.7H4.5C2.9 17.4 2 20.6 2 24s.9 6.6 2.5 9.7l7.3-5.4z"/><path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 7.9 6.9 4.5 14.3l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>'),
  Microsoft: uri('viewBox="0 0 100 100"><rect x="16" y="24" width="52" height="37" rx="12" fill="#2E7CF6"/><rect x="38" y="46" width="46" height="33" rx="11" fill="#7FB0FF"/>'),
}

export const orbitTiles = ['Claude', 'Gemini', 'OpenAI', 'Copilot', 'Perplexity', 'Kling', 'Google', 'Microsoft'].map((label, idx) => ({ idx, label, icon: ICON[label] }))

export const stepIcons = {
  fileText: uri('viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
  userRound: uri('viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'),
  messages: uri('viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>'),
}
