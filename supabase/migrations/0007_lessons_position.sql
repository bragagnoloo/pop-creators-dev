-- Add position column to lessons for manual ordering
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign positions matching the current display order (created_at DESC)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM lessons
)
UPDATE lessons SET position = ranked.rn FROM ranked WHERE lessons.id = ranked.id;
