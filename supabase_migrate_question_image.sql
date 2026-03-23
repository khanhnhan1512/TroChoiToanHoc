-- =============================================================
-- MIGRATION: Thêm cột question_image cho bảng questions
-- Chạy trong Supabase SQL Editor
-- =============================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_image text;
