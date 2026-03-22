-- =============================================================
-- MIGRATION: Thêm bảng grades (khối lớp) và liên kết với subjects
-- Chạy trong Supabase SQL Editor
-- =============================================================

-- 1. Bảng grades (khối lớp): Lớp 1-12 + Không xếp loại
CREATE TABLE IF NOT EXISTS grades (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL UNIQUE,  -- VD: "Lớp 1", "Lớp 5", "Lớp 10"
  level      int  NOT NULL,         -- Số thứ tự để sort: 1, 2, ..., 12
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read grades"
  ON grades FOR SELECT USING (true);

CREATE POLICY "Authenticated manage grades"
  ON grades FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Thêm cột grade_id vào subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_id uuid REFERENCES grades(id) ON DELETE SET NULL;

-- 3. Seed dữ liệu mặc định cho grades
INSERT INTO grades (name, level) VALUES
  ('Lớp 1',  1),
  ('Lớp 2',  2),
  ('Lớp 3',  3),
  ('Lớp 4',  4),
  ('Lớp 5',  5),
  ('Lớp 6',  6),
  ('Lớp 7',  7),
  ('Lớp 8',  8),
  ('Lớp 9',  9),
  ('Lớp 10', 10),
  ('Lớp 11', 11),
  ('Lớp 12', 12)
ON CONFLICT (name) DO NOTHING;
