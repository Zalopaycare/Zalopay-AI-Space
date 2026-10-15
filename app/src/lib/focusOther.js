// The "Khác" free-text box should grab focus only right after someone clicks "Khác" — not when a
// form opens with "Khác" already picked (restored draft / editing), which would scroll the form
// down to that box instead of showing it from the top.
let pickedAt = 0
export const markOtherPick = () => { pickedAt = Date.now() }
export const focusIfJustPicked = (el) => { if (el && Date.now() - pickedAt < 600) { pickedAt = 0; el.focus() } }
