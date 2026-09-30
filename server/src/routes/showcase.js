import express from 'express'
import { requireAuth } from '../auth.js'
import { showcaseCases, MEDIA_DIR } from '../showcase.js'

const router = express.Router()

router.get('/', requireAuth, (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({ cases: showcaseCases })
})

// Images only for signed-in users; `private` keeps shared caches from storing them.
router.use('/media', requireAuth, (req, res, next) => { res.set('Cache-Control', 'private, max-age=3600'); next() },
  express.static(MEDIA_DIR, { fallthrough: false, index: false, dotfiles: 'deny' }))

export default router
