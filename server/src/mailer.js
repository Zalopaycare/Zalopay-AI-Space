import nodemailer from 'nodemailer'

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM,
  SMTP_SECURE, SMTP_AUTH_METHOD, SMTP_TLS_SERVERNAME, SMTP_TLS_INSECURE,
  ALLOW_DEV_LOGIN_CODE,
} = process.env

let transporter = null
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    // Implicit TLS is assumed on 465, but some relays speak plaintext + STARTTLS there:
    // SMTP_SECURE=false overrides the guess (SMTP_SECURE=true forces implicit TLS on any port).
    secure: SMTP_SECURE ? String(SMTP_SECURE).toLowerCase() === 'true' : Number(SMTP_PORT) === 465,
    // IP-allowlisted relays (e.g. Exchange Online's "from your org's mail server" connector)
    // have no SMTP_USER/SMTP_PASS — they authenticate by source IP instead.
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    // Some relays only accept one mechanism (e.g. SMTP_AUTH_METHOD=LOGIN, as `swaks --auth LOGIN`).
    ...(SMTP_AUTH_METHOD ? { authMethod: String(SMTP_AUTH_METHOD).toUpperCase() } : {}),
    // Without implicit TLS, insist on STARTTLS so credentials and codes never go out in plaintext.
    requireTLS: true,
    // When SMTP_HOST is a bare IP the relay's certificate names a hostname instead:
    // SMTP_TLS_SERVERNAME checks the cert against that name; SMTP_TLS_INSECURE=true skips the check.
    tls: {
      ...(SMTP_TLS_SERVERNAME ? { servername: SMTP_TLS_SERVERNAME } : {}),
      ...(String(SMTP_TLS_INSECURE || '').toLowerCase() === 'true' ? { rejectUnauthorized: false } : {}),
    },
  })
  transporter.verify()
    .then(() => console.log(`[mailer] SMTP ready: ${SMTP_HOST}:${SMTP_PORT || 587} as ${SMTP_USER || '(IP relay)'}`))
    .catch((e) => console.error(`[mailer] SMTP check failed for ${SMTP_HOST}:${SMTP_PORT || 587}: ${e.code || ''} ${e.message}`))
}

export const mailerConfigured = !!transporter
export const devLoginCodeAllowed = String(ALLOW_DEV_LOGIN_CODE || '').toLowerCase() === 'true'

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}\n${text}`)
    return { sent: false }
  }
  await transporter.sendMail({ from: SMTP_FROM || SMTP_USER, to, subject, text })
  return { sent: true }
}
