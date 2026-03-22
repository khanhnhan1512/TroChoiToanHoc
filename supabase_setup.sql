-- =============================================================
-- CHẠY FILE NÀY TRONG SUPABASE SQL EDITOR
-- Project: https://supabase.com -> SQL Editor -> New query
-- =============================================================

-- 1. Bảng tests (danh sách bài test)
CREATE TABLE IF NOT EXISTS tests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text DEFAULT '',
  is_published boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 2. Bảng questions (câu hỏi của từng bài test)
CREATE TABLE IF NOT EXISTS questions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id         uuid REFERENCES tests(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('input', 'image')),
  question_text   text NOT NULL,
  answer          text NOT NULL,
  explanation_key text,
  image_mode      text,
  triangle_type   text,
  options         jsonb,
  hints           jsonb,
  sort_order      bigint DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies cho bảng tests
-- Học sinh: đọc bài test đã published
CREATE POLICY "Public read published tests"
  ON tests FOR SELECT
  USING (is_published = true);

-- Giáo viên (đã đăng nhập): đọc/sửa/xóa tất cả
CREATE POLICY "Authenticated full access to tests"
  ON tests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. RLS Policies cho bảng questions
-- Học sinh: đọc câu hỏi của bài test đã published
CREATE POLICY "Public read questions of published tests"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = questions.test_id
        AND tests.is_published = true
    )
  );

-- Giáo viên (đã đăng nhập): đọc/sửa/xóa tất cả
CREATE POLICY "Authenticated full access to questions"
  ON questions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
