-- =============================================================
-- CHẠY FILE NÀY TRONG SUPABASE SQL EDITOR
-- Project: https://supabase.com -> SQL Editor -> New query
--
-- LƯU Ý: Nếu bạn đã chạy phiên bản cũ, hãy chạy file
-- supabase_migrate.sql thay vì file này.
-- =============================================================

-- 1. Bảng subjects (môn học)
CREATE TABLE IF NOT EXISTS subjects (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  icon        text DEFAULT '📚',
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 2. Bảng tests (bài test, thuộc 1 môn học)
CREATE TABLE IF NOT EXISTS tests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id  uuid REFERENCES subjects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text DEFAULT '',
  is_published boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 3. Bảng questions (câu hỏi, thuộc 1 bài test)
-- type: 'multiple_choice' | 'fill_text' | 'true_false' | 'ordering' | 'image' | 'input'
CREATE TABLE IF NOT EXISTS questions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id         uuid REFERENCES tests(id) ON DELETE CASCADE,
  type            text NOT NULL,
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

-- 4. Enable Row Level Security
ALTER TABLE subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 5. RLS cho subjects
CREATE POLICY "Public read subjects"
  ON subjects FOR SELECT USING (true);

CREATE POLICY "Authenticated full access to subjects"
  ON subjects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. RLS cho tests
CREATE POLICY "Public read published tests"
  ON tests FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authenticated full access to tests"
  ON tests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. RLS cho questions
CREATE POLICY "Public read questions of published tests"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = questions.test_id
        AND tests.is_published = true
    )
  );

CREATE POLICY "Authenticated full access to questions"
  ON questions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
