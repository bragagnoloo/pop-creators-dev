-- Add expert field to lessons for displaying the presenter's name
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS expert TEXT;
