# Ankita Cyber Cafe Portal

A full Express + MySQL backend wrapped around the completed frontend UI. The original UI is preserved in `public/index.html`; `/assets/js/portal-api.js` connects every login, registration, dashboard, service, tracking, upload, payment, task, CMS, report, and admin action to REST APIs.

## Install

1. Install Node.js 20+ and MySQL 8+.
2. Create a database user, then copy `.env.example` to `.env` and update database, session, mail, and Razorpay values.
3. Install packages:

```powershell
npm install
```

4. Create schema and seed demo data:

```powershell
npm run setup
```

5. Start the app:

```powershell
npm start
```

Open `http://localhost:3000`.

## Demo Accounts

- Admin: `admin@ankitacyber.local` / `Admin@12345`
- Customer: `customer@example.com` / `Customer@12345`
- Creator: `creator@example.com` / `Creator@12345`

## Production Deployment

- Set `NODE_ENV=production`.
- Use a strong `SESSION_SECRET` and `JWT_SECRET`.
- Configure HTTPS at the reverse proxy.
- Set real Razorpay keys and SMTP credentials.
- Keep `storage/` outside public web access; files are streamed through permission-checked API routes.
- Run `npm run migrate` during deploy.
- Use a process manager such as PM2 or a container orchestrator.

## Security Included

Password hashing, server sessions, JWT-compatible auth helpers, CSRF token endpoint, Helmet headers, rate limits, MySQL parameter binding, file type/size validation, role checks, XSS sanitization, and permission-checked downloads.
