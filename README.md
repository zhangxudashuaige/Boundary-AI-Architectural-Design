# AI Architecture Render Backend

Node.js + Express + PostgreSQL backend starter for an AI architectural rendering website.

## Requirements

- Node.js 18+
- PostgreSQL 14+

## Setup

```bash
npm install
copy .env.example .env
```

## Environment Variables

Configure these variables in `.env`:

- `NODE_ENV`: runtime environment, default `development`
- `PORT`: HTTP port, default `3000`
- `LOG_LEVEL`: logger level, default `debug`
- `DATABASE_URL`: full PostgreSQL connection string, recommended for Railway
- `DB_HOST`: PostgreSQL host, default `localhost`
- `DB_PORT`: PostgreSQL port, default `5432`
- `DB_NAME`: database name, default `ai_arch_render`
- `DB_USER`: database user, default `postgres`
- `DB_PASSWORD`: database password, default `123456`
- `DB_SSL`: whether to enable SSL, `true` or `false`; set `true` on Railway if required
- `DB_MAX_POOL_SIZE`: pg connection pool size, default `10`
- `DB_IDLE_TIMEOUT_MS`: idle timeout for pool connections, default `10000`
- `DB_CONNECTION_TIMEOUT_MS`: connection timeout, default `5000`

## Database Initialization

1. Create the database:

```bash
createdb -U postgres ai_arch_render
```

If `createdb` is unavailable:

```bash
psql -U postgres -c "CREATE DATABASE ai_arch_render;"
```

2. Apply the schema:

```bash
psql -U postgres -d ai_arch_render -f database/init.sql
```

Or use the app environment variables directly:

```bash
npm run db:init
```

The initial schema already creates the `render_tasks` table for the next stage.
Detailed notes are in [database/README.md](database/README.md).

## Run

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Test

PowerShell on this machine blocks `npm.ps1`, so use:

```bash
npm.cmd test
```

This runs the smoke tests for `GET /health` and `POST /api/upload`.

## API

- `GET /health`: application health check
- `GET /health/db`: database health check
- `POST /api/upload`: upload a single image using the `image` form field
- `GET /uploads/<fileName>`: access an uploaded file

## Upload Constraints

- Allowed file types: `jpg`, `jpeg`, `png`, `webp`
- Maximum file size: `10MB`
- Files are saved to the local `uploads` directory

## Manual Upload Test

Use `curl`:

```bash
curl -X POST http://localhost:3000/api/upload ^
  -F "image=@C:\path\to\sample.png"
```

Or PowerShell:

```powershell
curl.exe -X POST http://localhost:3000/api/upload -F "image=@C:\path\to\sample.png"
```

Successful response example:

```json
{
  "fileName": "1711111111111-uuid-sample.png",
  "filePath": "uploads/1711111111111-uuid-sample.png",
  "url": "http://localhost:3000/uploads/1711111111111-uuid-sample.png"
}
```
