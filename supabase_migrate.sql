-- =============================================================
-- FILE MIGRATION: Chạy file này nếu bạn ĐÃ chạy phiên bản cũ
-- của supabase_setup.sql (chỉ có tests + questions)
-- =============================================================

-- 1. Tạo bảng subjects
CREATE TABLE IF NOT EXISTS subjects (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  icon        text DEFAULT '📚',
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 2. Thêm cột subject_id vào tests (cho phép NULL tạm thời)
ALTER TABLE tests ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE;

-- 3. Bỏ constraint cũ trên type (nếu có) để cho phép thêm loại mới
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;

-- 4. RLS cho subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subjects"
  ON subjects FOR SELECT USING (true);

CREATE POLICY "Authenticated full access to subjects"
  ON subjects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
