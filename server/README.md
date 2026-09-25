# Zalopay AI Community — backend

Express + better-sqlite3 API for the app in `../app`. Serves the built React
app as static files and the `/api/*` routes from one process — one container,
one port, no separate frontend host.

## Data model

- `users` — created on first successful login (email + code). `is_admin` is
  set from `ADMIN_EMAILS` on login.
- `questions` / `question_answers` / `answer_comments` / `question_reactions`
  / `answer_reactions` / `saved_questions` — the Questions page.
- `use_case_submissions` — the "Share a Use Case" form, with an admin
  `review_status` (pending/approved/rejected) and `admin_note`.
- `use_case_reactions` / `use_case_comments` / `use_case_saves` — helpful
  votes, comments and saves, keyed by use-case id. Works for both the 5
  built-in use cases (`c1`..`c5`, whose rich content lives in the frontend's
  `src/data/useCases.js`) and future submissions.
- `login_codes` — short-lived 6-digit email codes.

SQLite file lives at `${DATA_DIR}/app.db` (default `/data`). **This must be a
persistent volume in production** — without one, every redeploy wipes all
users, questions, use cases and votes.

## Auth

Login is by company email only (`COMPANY_EMAIL_DOMAINS`): request a 6-digit
code, it's emailed via SMTP, verifying it sets an httpOnly JWT cookie. No
SMTP configured → the code is logged to the server console instead (and,
only if `ALLOW_DEV_LOGIN_CODE=true`, echoed back in the API response) — fine
for local testing, never enable that flag in production.

**Microsoft Entra ID (Azure AD) SSO** is implemented (`src/sso.js`,
`/api/auth/sso/login` + `/api/auth/sso/callback`, Authorization Code + PKCE
via `openid-client`) but stays dark until all four `AZURE_*` vars in
`.env.example` are set — `GET /api/auth/config` reports `ssoEnabled` and the
frontend only shows the "Đăng nhập bằng Microsoft" button when it's true, so
there's nothing to toggle once IT hands back the App Registration's Client
ID / Tenant ID / Client Secret: just set the env vars and redeploy. Until
then, the email-code flow above is what everyone uses. Both flows write into
the same `users` table (`getOrCreateUser` in `src/auth.js`), so no migration
is needed when SSO comes online — existing accounts just start signing in a
different way.

## Environment variables

See `.env.example`. Required for a real deployment: `JWT_SECRET` (random),
`ADMIN_EMAILS`, and the `SMTP_*` vars (without them, no email — including
login codes and review notifications — actually sends).

## Requesting from IT

Two things to ask IT for when standing this up for real. Copy/paste and fill
in the blanks.

**1. Outbound mail (required)** — pick whichever they offer:

- *IP-allowlisted relay* (e.g. Exchange Online's "from your organization's
  mail server" connector): ask them to allowlist this server's outbound IP
  to relay mail as `SMTP_FROM` (e.g. `noreply@zalopay.vn`), then set
  `SMTP_HOST` / `SMTP_PORT=25` and leave `SMTP_USER` / `SMTP_PASS` blank.
- *Mailbox login*: ask for a service-account mailbox with SMTP AUTH enabled,
  then set `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

**2. Microsoft Entra ID (Azure AD) App Registration (optional, for SSO)** —
ask IT to create an App Registration with:

- Redirect URI: `https://YOUR-DOMAIN/api/auth/sso/callback` (Web platform)
- API permissions: `openid`, `profile`, `email` (delegated, Microsoft Graph)
- A client secret

Then set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
`AZURE_REDIRECT_URI` from what they hand back and redeploy — see the SSO
note above for how it turns on automatically.

## Development

```bash
npm install
DATA_DIR=./data ALLOW_DEV_LOGIN_CODE=true npm run dev   # :3000
```

Run the frontend's own dev server (`../app`, `npm run dev`) alongside it —
its Vite config proxies `/api` to `:3000`.

## Production

Built and run via the root `../Dockerfile` (multi-stage: builds `../app`,
then copies the static output into this server's `public/`). Mount `/data`
as a persistent volume.
