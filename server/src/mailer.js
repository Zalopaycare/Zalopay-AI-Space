import nodemailer from 'nodemailer'

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM,
  ALLOW_DEV_LOGIN_CODE,
} = process.env

let transporter = null
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    // IP-allowlisted relays (e.g. Exchange Online's "from your org's mail server" connector)
    // have no SMTP_USER/SMTP_PASS — they authenticate by source IP instead, over STARTTLS.
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    requireTLS: !SMTP_USER,
  })
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
