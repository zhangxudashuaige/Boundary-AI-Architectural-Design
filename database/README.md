# Database Initialization

## Required environment variables

Use these values in `.env`:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `DB_MAX_POOL_SIZE`
- `DB_IDLE_TIMEOUT_MS`
- `DB_CONNECTION_TIMEOUT_MS`

## 1. Create the database

Using `psql`:

```bash
psql -U postgres -f database/create_database.sql
```

Or directly:

```bash
psql -U postgres -c "CREATE DATABASE ai_arch_render;"
```

If the database name in `.env` is not `ai_arch_render`, update the SQL or replace the name in the command.

## 2. Apply the schema

```bash
psql -U postgres -d ai_arch_render -f database/init.sql
```

## 3. Start the backend

```bash
npm run dev
```

PowerShell on this machine can also use:

```powershell
node src/server.js
```

## 4. Verify the database connection

Call:

```text
GET /health/db
```

Healthy response: HTTP `200`
Connection failed response: HTTP `503`

## 5. Notes about the schema

`database/init.sql` upgrades the existing `render_tasks` table in place and adds:

- task fields:
  - `id`
  - `input_image_url`
  - `input_file_url`
  - `input_file_type`
  - `raw_prompt`
  - `render_prompt`
  - `analysis_request`
  - `optimized_prompt`
  - `status`
  - `analysis_status`
  - `render_status`
  - `analysis_result`
  - `result_image_url`
  - `error_message`
  - `created_at`
  - `updated_at`
- status constraint: `pending`, `processing`, `completed`, `failed`
- stage status constraint: `pending`, `processing`, `completed`, `failed`, `skipped`
- indexes for `status` and `created_at`
- indexes for `analysis_status` and `render_status`
- automatic `updated_at` update trigger
- compatibility migration from the older `source_image_path` / `prompt` /
  `result_image_path` naming
- compatibility backfill from:
  - `input_image_url` -> `input_file_url`
  - `raw_prompt` -> `render_prompt`
  - legacy render-only rows -> `analysis_status = 'skipped'`
