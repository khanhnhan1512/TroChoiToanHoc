-- =============================================================
-- MIGRATION: Thêm bảng ai_messages để lưu lịch sử chat AI
-- Chạy trong Supabase SQL Editor
-- =============================================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id    uuid REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Chỉ giáo viên (đã đăng nhập) mới có thể đọc/ghi lịch sử chat
CREATE POLICY "Authenticated full access to ai_messages"
  ON ai_messages FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
