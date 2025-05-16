-- Add max_questions column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_questions INTEGER DEFAULT 0; 