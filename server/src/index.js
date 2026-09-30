import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachUser } from './auth.js'
import authRoutes from './routes/auth.js'
import questionRoutes from './routes/questions.js'
import useCaseRoutes from './routes/useCases.js'
import notificationRoutes from './notifications.js'
import adminRoutes from './routes/admin.js'
import { reportRoutes } from './reports.js'
import showcaseRoutes from './routes/showcase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'public')
const PORT = Number(process.env.PORT || 3000)

const app = express()

// One public address: a page opened on any other host (e.g. the old generated *.zalopay.xyz link)
// is sent to the same path on APP_URL. SSO needs this — its state cookie is set on the host where
// login starts, while Microsoft always returns to APP_URL. Internal calls (localhost, raw IPs,
// the health check) and non-GET requests are left alone.
const canonical = (() => { try { return process.env.APP_URL ? new URL(process.env.APP_URL) : null } catch { return null } })()
app.use((req, res, next) => {
  if (!canonical || (req.method !== 'GET' && req.method !== 'HEAD') || req.path === '/api/health') return next()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '')
  if (!host || host === canonical.hostname || host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) return next()
  res.redirect(301, canonical.origin + req.originalUrl)
})

app.use(express.json({ limit: '12mb' }))
app.use(cookieParser())
app.use(attachUser)

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/use-cases', useCaseRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/showcase', showcaseRoutes)

app.use(express.static(STATIC_DIR))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(STATIC_DIR, 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'server_error' })
})

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT} (static: ${STATIC_DIR})`)
})
