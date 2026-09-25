// Preset avatar colors — keep in sync with server/src/avatarColors.js by hand
// (no shared package between the client and server bundles).
export const AVATAR_COLORS = [
  '#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF',
  '#D8232A', '#B45300', '#00893F', '#C2410C', '#0E7490', '#7C3AED',
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
