// Reactions on a reply or a comment, Facebook-style: one per person, of one of these kinds
// (❤️ like is what a plain click gives; the others come from the picker).
export const REACTION_TYPES = ['like', 'haha', 'wow', 'sad', 'angry']
export const reactionType = (v) => (REACTION_TYPES.includes(v) ? v : 'like')

/** rows [{ type, user_id }] → { counts: { like: 2, wow: 1 }, total, mine: 'wow' | null } */
export function summarize(rows, userId) {
  const counts = {}
  let mine = null
  for (const r of rows) {
    const k = reactionType(r.type)
    counts[k] = (counts[k] || 0) + 1
    if (userId && r.user_id === userId) mine = k
  }
  return { counts, total: rows.length, mine }
}

/** What a click does: the same kind again takes the reaction back, another kind switches to it. */
export const nextReaction = (current, wanted) => (current && current === wanted ? null : wanted)
