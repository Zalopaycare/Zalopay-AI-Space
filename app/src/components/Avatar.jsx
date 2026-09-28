// Preset avatar colors — keep in sync with server/src/avatarColors.js by hand
// (no shared package between the client and server bundles).
export const AVATAR_COLORS = [
  '#E0353F', '#D8232A', '#C2410C', '#B45300', '#FF8D00', '#D97706',
  '#CA8A04', '#65A30D', '#00893F', '#00A352', '#00CF6A', '#059669',
  '#0E7490', '#00B7FF', '#0284C7', '#0033C9', '#2c5fff', '#4F46E5',
  '#6F0CE2', '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#E11D48',
]

/** Deterministic fallback color for people who haven't picked one yet. */
export function fallbackAvatarColor(seed) {
  const s = String(seed || '?')
  return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length]
}

/**
 * The colored initials circle used everywhere a person's avatar shows up. Pass any
 * user-ish object with `initials` + `name` (or `author`), and optionally `avatarColor`
 * (from the API — a person's own pick) to use their real color instead of the hash
 * fallback.
 */
export default function Avatar({ user, size = 36, fontSize }) {
  const initials = user?.initials || '?'
  const color = user?.avatarColor || fallbackAvatarColor(user?.name || user?.author || user?.email || initials)
  const fs = fontSize || Math.round(size * 0.36)
  return (
    <span
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: fs,
        fontFamily: '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif',
      }}
    >
      {initials}
    </span>
  )
}
