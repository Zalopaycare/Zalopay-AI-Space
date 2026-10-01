// Preset avatar colors users can choose from (PATCH /auth/me). Keep this list in sync
// with app/src/components/Avatar.jsx's AVATAR_COLORS — there's no shared package between
// the two, so it's duplicated by hand.
export const AVATAR_COLORS = [
  '#E0353F', '#D8232A', '#C2410C', '#B45300', '#FF8D00', '#D97706',
  '#CA8A04', '#65A30D', '#00893F', '#00A352', '#00CF6A', '#059669',
  '#0E7490', '#00B7FF', '#0284C7', '#0033C9', '#2c5fff', '#4F46E5',
  '#6F0CE2', '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#E11D48',
]

/** A person's avatar color: their own pick, else a fixed color derived from their email, so
 *  everyone without a pick still looks the same on every page and every device. */
export function colorOf(u) {
  if (!u) return null
  if (u.avatar_color) return u.avatar_color
  let h = 0
  for (const ch of String(u.email || u.name || '?').toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
