// Download rows as a CSV file Excel opens correctly (UTF-8 BOM, quoted cells, CRLF).
export function downloadCsv(filename, header, rows) {
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const text = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
