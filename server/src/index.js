import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachUser } from './auth.js'
import authRoutes from './routes/auth.js'
import questionRoutes from './routes/questions.js'
import useCaseRoutes from './routes/useCases.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'public')
const PORT = Number(process.env.PORT || 3000)

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use(attachUser)

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/use-cases', useCaseRoutes)

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
