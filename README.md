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
- `EMAIL_HOST` - SMTP host.
- `EMAIL_PORT` - SMTP port.
- `EMAIL_USER` - SMTP username/email.
- `EMAIL_PASS` - SMTP app password.
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

Recommended production values:

```env
NODE_ENV=production
DB_SSL=true
DB_SYNCHRONIZE=false
FRONTEND_URLS=https://your-frontend-domain.com
FRONTEND_APP_URL=https://your-frontend-domain.com
```

Before deploying with `DB_SYNCHRONIZE=false`, make sure the Supabase database schema already exists.
