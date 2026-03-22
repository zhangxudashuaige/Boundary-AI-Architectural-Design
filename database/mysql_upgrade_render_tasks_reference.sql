-- Reference only.
-- The current project runs on PostgreSQL and should apply database/init.sql.
-- This file is only a MySQL 8+ style ALTER TABLE example for the same schema change.

ALTER TABLE render_tasks
  ADD COLUMN input_file_url TEXT NULL,
  ADD COLUMN input_file_type VARCHAR(32) NULL DEFAULT 'image',
  ADD COLUMN render_prompt TEXT NULL,
  ADD COLUMN analysis_request TEXT NULL,
  ADD COLUMN analysis_status VARCHAR(32) NULL DEFAULT 'pending',
  ADD COLUMN render_status VARCHAR(32) NULL DEFAULT 'pending',
  ADD COLUMN analysis_result JSON NULL;

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
SET render_status = COALESCE(render_status, status, 'pending')
WHERE render_status IS NULL;

ALTER TABLE render_tasks
  MODIFY COLUMN input_image_url TEXT NULL,
  MODIFY COLUMN input_file_url TEXT NOT NULL,
  MODIFY COLUMN input_file_type VARCHAR(32) NOT NULL DEFAULT 'image',
  MODIFY COLUMN render_prompt TEXT NOT NULL,
  MODIFY COLUMN analysis_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  MODIFY COLUMN render_status VARCHAR(32) NOT NULL DEFAULT 'pending';

ALTER TABLE render_tasks
  ADD CONSTRAINT render_tasks_analysis_status_valid
  CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  ADD CONSTRAINT render_tasks_render_status_valid
  CHECK (render_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

CREATE INDEX idx_render_tasks_analysis_status
  ON render_tasks (analysis_status);

CREATE INDEX idx_render_tasks_render_status
  ON render_tasks (render_status);
