# IdeaFlow Backend

NestJS API for the IdeaFlow application.

## Requirements

- Node.js 20+
- npm
- PostgreSQL 15+ or Supabase PostgreSQL

## Environment

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required variables:

- `DB_HOST` - PostgreSQL host.
- `DB_PORT` - PostgreSQL port, usually `5432` locally or `6543` for Supabase pooler.
- `DB_USERNAME` - database user.
- `DB_PASSWORD` - database password.
- `DB_NAME` - database name.
- `DB_SYNCHRONIZE` - `true` only for local development or one-time schema creation; use `false` in production.
- `DB_SSL` - `false` locally, `true` for Supabase/Render production connections.
- `NODE_ENV` - `development` locally, `production` on Render.
- `PORT` - backend port, default local value is `3000`.
- `JWT_SECRET` - long random secret for JWT signing.
- `JWT_EXPIRES_IN` - JWT lifetime, for example `7d`.
- `EMAIL_PROVIDER` - email provider: `resend` by default, or `smtp` for the old SMTP mode.
- `RESEND_API_KEY` - Resend API key, required when `EMAIL_PROVIDER=resend`.
- `EMAIL_FROM` - sender address, for example `IdeaFlow <noreply@your-domain.com>`.
- `EMAIL_HOST` - SMTP host, used only when `EMAIL_PROVIDER=smtp`.
- `EMAIL_PORT` - SMTP port, used only when `EMAIL_PROVIDER=smtp`.
- `EMAIL_USER` - SMTP username/email, used only when `EMAIL_PROVIDER=smtp`.
- `EMAIL_PASS` - SMTP app password, used only when `EMAIL_PROVIDER=smtp`.
- `FRONTEND_URLS` - comma-separated allowed frontend origins for CORS.
- `FRONTEND_APP_URL` - public frontend URL used in email links.

Do not commit `.env` with real secrets.

## Local database

Create the database manually before first backend start:

```sql
CREATE DATABASE ideaflow_db;
```

For local development keep:

```env
NODE_ENV=development
DB_SYNCHRONIZE=true
DB_SSL=false
```

With these values TypeORM creates missing tables from entity classes on startup.

## Install and run

```bash
npm install
npm run start:dev
```

The API starts on:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## Production notes

For Render + Supabase use environment variables in the Render dashboard, not `.env`.

Recommended Render settings:

```text
Build command: npm install --include=dev && npm run build
Start command: npm run start:prod
```

Recommended production values:

```env
NODE_ENV=production
DB_SSL=true
DB_SYNCHRONIZE=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=IdeaFlow <noreply@your-domain.com>
FRONTEND_URLS=https://your-frontend-domain.com
FRONTEND_APP_URL=https://your-frontend-domain.com
```

Before deploying with `DB_SYNCHRONIZE=false`, make sure the Supabase database schema already exists.

## Email provider

The application supports two email modes:

```env
EMAIL_PROVIDER=resend
```

Use this mode on Render Free because Render Free blocks outbound SMTP ports.

```env
EMAIL_PROVIDER=smtp
```

Use this mode only for local testing or paid hosting where SMTP ports are available.

### Resend setup

1. Create an account at `https://resend.com`.
2. Open `API Keys` and create an API key.
3. Add your domain in Resend, for example `your-domain.com`.
4. Copy the DNS records from Resend to Cloudflare DNS.
5. Keep Resend DNS records as `DNS only` in Cloudflare.
6. Wait until the domain is verified in Resend.
7. Use a sender like `IdeaFlow <noreply@your-domain.com>`.

### Local Resend test

Set these values in local `.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=IdeaFlow <noreply@your-domain.com>
FRONTEND_APP_URL=http://localhost:3001
```

Then run:

```bash
npm run start:dev
```

Register a new user from the frontend and check that the verification email arrives.

### Local SMTP fallback test

Set these values in local `.env`:

```env
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=IdeaFlow <your-email@gmail.com>
```

Do not use SMTP mode on Render Free.
