BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS render_tasks (
  id BIGSERIAL PRIMARY KEY,
  input_image_url TEXT,
  input_file_url TEXT NOT NULL,
  input_file_type VARCHAR(32) NOT NULL DEFAULT 'image',
  raw_prompt TEXT NOT NULL,
  render_prompt TEXT NOT NULL,
  analysis_request TEXT,
  optimized_prompt TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  analysis_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  render_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  analysis_result JSONB,
  result_image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'render_tasks'
      AND column_name = 'source_image_path'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'render_tasks'
        AND column_name = 'input_image_url'
    ) THEN
      UPDATE render_tasks
      SET input_image_url = COALESCE(input_image_url, source_image_path)
      WHERE source_image_path IS NOT NULL;

      ALTER TABLE render_tasks
      DROP COLUMN source_image_path;
    ELSE
      ALTER TABLE render_tasks
      RENAME COLUMN source_image_path TO input_image_url;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'render_tasks'
      AND column_name = 'prompt'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'render_tasks'
        AND column_name = 'raw_prompt'
    ) THEN
      UPDATE render_tasks
      SET raw_prompt = COALESCE(raw_prompt, prompt)
      WHERE prompt IS NOT NULL;

      ALTER TABLE render_tasks
      DROP COLUMN prompt;
    ELSE
      ALTER TABLE render_tasks
      RENAME COLUMN prompt TO raw_prompt;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'render_tasks'
      AND column_name = 'result_image_path'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'render_tasks'
        AND column_name = 'result_image_url'
    ) THEN
      UPDATE render_tasks
      SET result_image_url = COALESCE(result_image_url, result_image_path)
      WHERE result_image_path IS NOT NULL;

      ALTER TABLE render_tasks
      DROP COLUMN result_image_path;
    ELSE
      ALTER TABLE render_tasks
      RENAME COLUMN result_image_path TO result_image_url;
    END IF;
  END IF;
END;
$$;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS input_image_url TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS input_file_url TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS input_file_type VARCHAR(32);

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS raw_prompt TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS render_prompt TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS analysis_request TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS optimized_prompt TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS status VARCHAR(32);

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(32);

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS render_status VARCHAR(32);

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS analysis_result JSONB;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS result_image_url TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE render_tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE render_tasks
SET status = 'pending'
WHERE status IS NULL;

UPDATE render_tasks
SET input_file_url = COALESCE(input_file_url, input_image_url)
WHERE input_file_url IS NULL;

UPDATE render_tasks
SET input_file_type = 'image'
WHERE input_file_type IS NULL;

UPDATE render_tasks
SET render_prompt = COALESCE(render_prompt, raw_prompt)
WHERE render_prompt IS NULL;

UPDATE render_tasks
SET raw_prompt = COALESCE(raw_prompt, render_prompt)
WHERE raw_prompt IS NULL;

UPDATE render_tasks
SET analysis_status = 'skipped'
WHERE analysis_status IS NULL;

UPDATE render_tasks
SET render_status = COALESCE(status, 'pending')
WHERE render_status IS NULL;

UPDATE render_tasks
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE render_tasks
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE render_tasks
ALTER COLUMN input_image_url DROP NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN input_file_url SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN input_file_type SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN input_file_type SET DEFAULT 'image';

ALTER TABLE render_tasks
ALTER COLUMN raw_prompt SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN render_prompt SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN status SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE render_tasks
ALTER COLUMN analysis_status SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN analysis_status SET DEFAULT 'pending';

ALTER TABLE render_tasks
ALTER COLUMN render_status SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN render_status SET DEFAULT 'pending';

ALTER TABLE render_tasks
ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE render_tasks
ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE render_tasks
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE render_tasks
DROP CONSTRAINT IF EXISTS render_tasks_status_check;

ALTER TABLE render_tasks
DROP CONSTRAINT IF EXISTS render_tasks_status_valid;

ALTER TABLE render_tasks
ADD CONSTRAINT render_tasks_status_valid
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE render_tasks
DROP CONSTRAINT IF EXISTS render_tasks_analysis_status_valid;

ALTER TABLE render_tasks
ADD CONSTRAINT render_tasks_analysis_status_valid
CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

ALTER TABLE render_tasks
DROP CONSTRAINT IF EXISTS render_tasks_render_status_valid;

ALTER TABLE render_tasks
ADD CONSTRAINT render_tasks_render_status_valid
CHECK (render_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_render_tasks_status
  ON render_tasks (status);

CREATE INDEX IF NOT EXISTS idx_render_tasks_analysis_status
  ON render_tasks (analysis_status);

CREATE INDEX IF NOT EXISTS idx_render_tasks_render_status
  ON render_tasks (render_status);

CREATE INDEX IF NOT EXISTS idx_render_tasks_created_at
  ON render_tasks (created_at DESC);

DROP TRIGGER IF EXISTS trg_render_tasks_updated_at ON render_tasks;

CREATE TRIGGER trg_render_tasks_updated_at
BEFORE UPDATE ON render_tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
