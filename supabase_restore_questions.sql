-- =============================================================
-- RESTORE: Bài test gốc "Phương Ny Test" từ file index.html cũ
-- Chạy trong Supabase SQL Editor
-- =============================================================

DO $$
DECLARE
  v_grade_id   uuid;
  v_subject_id uuid;
  v_test_id    uuid;
BEGIN

  -- 1. Tạo (hoặc tìm) khối Lớp 5
  SELECT id INTO v_grade_id FROM grades WHERE name = 'Lớp 5' LIMIT 1;
  IF v_grade_id IS NULL THEN
    INSERT INTO grades (name, level) VALUES ('Lớp 5', 5) RETURNING id INTO v_grade_id;
  END IF;

  -- 2. Tạo (hoặc tìm) môn Toán học thuộc Lớp 5
  SELECT id INTO v_subject_id FROM subjects WHERE name = 'Toán học' AND grade_id = v_grade_id LIMIT 1;
  IF v_subject_id IS NULL THEN
    INSERT INTO subjects (name, icon, grade_id) VALUES ('Toán học', '🧮', v_grade_id) RETURNING id INTO v_subject_id;
  END IF;

  -- 3. Tạo bài test "Phương Ny Test"
  INSERT INTO tests (title, description, subject_id, is_published)
  VALUES ('Phương Ny Test', 'Bài test gốc về các loại tam giác và số đo góc', v_subject_id, true)
  RETURNING id INTO v_test_id;

  -- 4. Insert toàn bộ câu hỏi

  -- === LOẠI IMAGE (nhận biết hình tam giác) ===
  INSERT INTO questions (test_id, type, question_text, answer, options, image_mode, triangle_type, explanation_key, hints, sort_order) VALUES
  (v_test_id, 'image', 'HÌNH NÀO DƯỚI ĐÂY LÀ TAM GIÁC VUÔNG CÂN?', 'vuongcan',
    '["vuong","deu","vuongcan"]'::jsonb, 'svg', 'vuongcan', 'image',
    '["","","Hãy kết hợp việc tìm hình có kí hiệu góc vuông và kí hiệu 2 cạnh bằng nhau."]'::jsonb, 101),

  (v_test_id, 'image', 'Hình nào biểu diễn một tam giác đều?', 'deu',
    '["vuong","can","deu"]'::jsonb, 'svg', 'deu', 'image',
    '["","","Em hãy tìm hình có 3 vạch kí hiệu bằng nhau trên 3 cạnh."]'::jsonb, 102),

  (v_test_id, 'image', 'Đâu là hình ảnh của tam giác tù (có góc lớn hơn 90°)?', 'tu',
    '["can","tu","vuong"]'::jsonb, 'svg', 'tu', 'image',
    '["","","Quan sát xem hình nào có một góc ngả rộng ra sau rõ rệt."]'::jsonb, 103),

  (v_test_id, 'image', 'Đâu là tam giác vuông?', 'vuong',
    '["thuong","vuong","deu"]'::jsonb, 'svg', 'vuong', 'image',
    '["","","Chỉ cần tìm hình có kí hiệu góc đặc biệt màu đỏ thôi nhé."]'::jsonb, 104),

  (v_test_id, 'image', 'Mái nhà cân đối thường có hình tam giác cân. Đâu là tam giác cân?', 'can',
    '["deu","can","vuong"]'::jsonb, 'svg', 'can', 'image',
    '["","","Hãy tìm hình cân xứng hai bên cạnh, nhưng không có góc vuông."]'::jsonb, 105),

  (v_test_id, 'image', 'Hình nào không có cạnh hay góc nào bằng nhau cả?', 'thuong',
    '["thuong","deu","can"]'::jsonb, 'svg', 'thuong', 'image',
    '["","","Hãy chọn hình không có bất kỳ vạch kẻ hay kí hiệu góc đặc biệt nào."]'::jsonb, 106),

  (v_test_id, 'image', 'Tam giác nào có tổng 2 góc nhọn bằng đúng 90°?', 'vuong',
    '["vuong","can","tu"]'::jsonb, 'svg', 'vuong', 'image',
    '["","","Nếu 2 góc gộp lại bằng 90, vậy góc thứ 3 phải là 90 độ để tổng là 180. Hãy chọn hình tương ứng."]'::jsonb, 107),

  (v_test_id, 'image', 'Tam giác nào có 3 trục đối xứng?', 'deu',
    '["can","deu","thuong"]'::jsonb, 'svg', 'deu', 'image',
    '["","","Hình có 3 trục đối xứng thì mọi cạnh đều phải bằng nhau."]'::jsonb, 108),

  (v_test_id, 'image', 'Chiếc ê-ke có hai cạnh góc vuông bằng nhau. Nó là hình gì?', 'vuongcan',
    '["vuong","vuongcan","deu"]'::jsonb, 'svg', 'vuongcan', 'image',
    '["","","Hình này cần sự xuất hiện của hai loại kí hiệu trên cùng một tam giác."]'::jsonb, 109),

  (v_test_id, 'image', 'Hình nào có một góc bằng tổng của hai góc còn lại?', 'vuong',
    '["tu","vuong","can"]'::jsonb, 'svg', 'vuong', 'image',
    '["","","Nếu một góc bằng tổng hai góc kia, góc đó chiếm đúng một nửa của 180 độ. Hãy tìm hình đó."]'::jsonb, 110);

  -- === LOẠI INPUT (tính số đo góc) ===
  INSERT INTO questions (test_id, type, question_text, answer, triangle_type, explanation_key, hints, sort_order) VALUES
  (v_test_id, 'input', 'Góc A=60°, B=40°. Góc C bằng?', '80', 'thuong', 'tong3goc',
    '["","","Em hãy tính tổng hai góc đã cho, rồi dùng phép trừ với tổng số đo tam giác nhé."]'::jsonb, 1),

  (v_test_id, 'input', 'Tam giác có góc 50° và 50°. Góc thứ ba?', '80', 'can', 'tong3goc',
    '["","","Em hãy thử lấy tổng số đo 3 góc của tam giác trừ đi hai góc đề bài đã cung cấp xem sao."]'::jsonb, 2),

  (v_test_id, 'input', 'Tam giác vuông có góc nhọn 35°. Tính góc nhọn còn lại?', '55', 'vuong', 'tamgiacvuong',
    '["","","Vì là tam giác vuông nên em chỉ cần lấy tổng hai góc nhọn trừ đi góc đã biết thôi."]'::jsonb, 3),

  (v_test_id, 'input', 'Góc mái lều là 90°, góc phải 30°. Góc trái?', '60', 'vuong', 'tamgiacvuong',
    '["","","Mái lều có góc 90 độ, em hãy áp dụng quy tắc tính góc trong tam giác vuông để tìm góc còn lại."]'::jsonb, 4),

  (v_test_id, 'input', 'Tam giác có góc ở đỉnh 100°. TỔNG hai góc ở đáy?', '80', 'tu', 'tong3goc',
    '["","","Đề bài chỉ hỏi tổng của 2 góc. Hãy lấy quỹ chung là 180 độ trừ đi góc ở đỉnh."]'::jsonb, 5),

  (v_test_id, 'input', 'Tam giác có hai góc 45° và 45°. Góc thứ ba?', '90', 'vuongcan', 'tong3goc',
    '["","","Hãy thử gộp hai góc đã biết lại, rồi trừ chúng ra khỏi 180 độ nhé."]'::jsonb, 6),

  (v_test_id, 'input', 'Tổng của góc 1 và góc 2 là 120°. Góc thứ 3?', '60', 'thuong', 'tong3goc',
    '["","","Đề bài đã gộp sẵn hai góc cho em rồi, giờ chỉ cần lấy 180 độ trừ đi con số đó là xong."]'::jsonb, 7),

  (v_test_id, 'input', 'Một góc đo 72°, góc kia 48°. Góc còn thiếu là?', '60', 'thuong', 'tong3goc',
    '["","","Em hãy đặt nháp tính tổng hai góc này trước, rồi hẵng trừ khỏi tổng số đo tam giác."]'::jsonb, 8),

  (v_test_id, 'input', 'Ê-ke có góc vuông và góc 60°. Góc còn lại?', '30', 'vuong', 'tamgiacvuong',
    '["","","Góc vuông có số đo chuẩn rồi, em hãy áp dụng phép trừ để tìm phần còn thiếu nhé."]'::jsonb, 9),

  (v_test_id, 'input', 'Biển báo tam giác có 3 góc BẰNG NHAU. Mỗi góc bằng?', '60', 'deu', 'tamgiacdeu',
    '["","","Có 180 độ mà chia đều tăm tắp cho 3 phần. Em hãy làm phép tính chia."]'::jsonb, 10),

  (v_test_id, 'input', 'Diều tam giác cân có góc ở đỉnh 40°. MỘT góc ở đáy?', '70', 'can', 'tamgiaccan',
    '["","","Đầu tiên trừ góc ở đỉnh ra khỏi 180. Sau đó vì hai góc đáy bằng nhau nên em phải chia đôi kết quả."]'::jsonb, 11),

  (v_test_id, 'input', 'Tam giác cân có một góc đáy 50°. Tính góc đỉnh?', '80', 'can', 'tamgiaccan',
    '["","","Em hãy nhân đôi góc ở đáy lên, sau đó lấy 180 độ trừ đi tổng đó nhé."]'::jsonb, 12),

  (v_test_id, 'input', 'Tam giác vuông cân. Mỗi góc nhọn bằng?', '45', 'vuongcan', 'tamgiacvuong',
    '["","","Tổng hai góc nhọn là 90 độ, mà chúng lại bằng nhau. Em hãy làm phép chia đều."]'::jsonb, 13),

  (v_test_id, 'input', 'Tam giác có góc tù 120°, hai góc nhọn bằng nhau. Một góc nhọn bằng?', '30', 'tu', 'tamgiaccan',
    '["","","Lấy 180 độ trừ đi góc tù, phần dư còn lại em chia đều cho 2 góc nhọn nhé."]'::jsonb, 14),

  (v_test_id, 'input', 'Trong tam giác đều, TỔNG của hai góc bất kỳ bằng?', '120', 'deu', 'tamgiacdeu',
    '["","","Hãy nhớ lại mỗi góc của tam giác đều bằng bao nhiêu, rồi làm phép tính cộng."]'::jsonb, 15),

  (v_test_id, 'input', 'Góc A gấp 3 góc B, C gấp 2 góc B. Hỏi góc B?', '30', 'thuong', 'tong3goc',
    '["","","Tính tổng số phần bằng nhau của cả 3 góc, sau đó lấy 180 độ chia cho tổng số phần đó."]'::jsonb, 16),

  (v_test_id, 'input', 'Góc A là 90°. Góc B gấp đôi C. Hỏi góc C?', '30', 'vuong', 'tamgiacvuong',
    '["","","Tổng B và C là 90. B gấp đôi C nên có tổng cộng 3 phần. Lấy 90 chia cho số phần nhé."]'::jsonb, 17),

  (v_test_id, 'input', 'Góc A lớn hơn B là 20°. C = 60°. Hỏi góc B?', '50', 'thuong', 'tong3goc',
    '["","","Tính tổng A+B trước. Sau đó dùng công thức: Lấy Tổng trừ đi Hiệu rồi chia đôi."]'::jsonb, 18),

  (v_test_id, 'input', 'Tổng (A+B)=130°, (B+C)=100°. Tìm góc B?', '50', 'thuong', 'tong3goc',
    '["","","Khi biết (A+B), em tính được góc C từ 180. Có C rồi thì thay vào (B+C) để tìm B."]'::jsonb, 19),

  (v_test_id, 'input', 'Góc A bằng nửa góc vuông. B = 100°. Góc C?', '35', 'tu', 'tong3goc',
    '["","","Góc vuông chia đôi là bao nhiêu? Có góc A rồi em dùng quy tắc 180 độ bình thường."]'::jsonb, 20),

  (v_test_id, 'input', 'Góc ngoài tại C là 110°. Tính góc C bên trong?', '70', 'thuong', 'gocbet',
    '["","","Góc ngoài và góc trong tạo thành một đường thẳng. Em hãy dùng phép trừ với 180."]'::jsonb, 21),

  (v_test_id, 'input', 'Góc A và B phụ nhau (tổng 90°). Góc C?', '90', 'vuong', 'tong3goc',
    '["","","Đề đã cho sẵn tổng của hai góc rồi, em chỉ việc lấy quỹ 180 độ trừ đi tổng đó."]'::jsonb, 22),

  (v_test_id, 'input', 'Tỉ số A và B là 1:2. Góc C=90°. Tính A?', '30', 'vuong', 'tamgiacvuong',
    '["","","Tổng A và B cũng bằng 90 độ. Hãy chia 90 độ ra làm 3 phần bằng nhau."]'::jsonb, 23),

  (v_test_id, 'input', 'Tam giác chu vi 30cm, góc đỉnh 80°. Tổng 2 góc đáy?', '100', 'can', 'tong3goc',
    '["","","Chu vi là số liệu gây nhiễu! Tính góc hãy cứ lấy 180 độ trừ đi góc đã cho."]'::jsonb, 24),

  (v_test_id, 'input', 'Tam giác đều. Tia phân giác chia 1 góc thành góc nhỏ bằng?', '30', 'deu', 'tamgiacdeu',
    '["","","Góc ban đầu của tam giác đều bị chia đôi ra, kết quả là bao nhiêu?"]'::jsonb, 25),

  (v_test_id, 'input', 'Ghép 2 tam giác vuông. 1 góc là 40°, góc nhọn còn lại?', '50', 'vuong', 'tamgiacvuong',
    '["","","Đã có một góc nhọn, em hãy lấy tổng của hai góc nhọn để trừ đi số này."]'::jsonb, 26),

  (v_test_id, 'input', 'Tam giác có M=55°, N=55°. Góc P?', '70', 'can', 'tong3goc',
    '["","","Cộng hai góc đã biết lại với nhau, rồi trừ chúng ra khỏi 180 độ."]'::jsonb, 27),

  (v_test_id, 'input', 'Góc lớn nhất của tam giác KHÔNG THỂ đạt đến số nào?', '180', 'thuong', 'tong3goc',
    '["","","Tổng 3 góc bằng đúng một con số chuẩn. Một góc lẻ không thể chiếm trọn vẹn con số đó được."]'::jsonb, 28),

  (v_test_id, 'input', 'Tam giác có A=60°, B=60°. Tính góc C?', '60', 'deu', 'tong3goc',
    '["","","Hãy thử tính góc C bằng phép trừ với 180 độ xem kết quả là bao nhiêu."]'::jsonb, 29),

  (v_test_id, 'input', 'A=40°, B=50°. Góc ngoài tại C bằng?', '90', 'vuong', 'gocbet',
    '["","","Bước 1: Tính góc C bên trong. Bước 2: Lấy 180 độ trừ đi góc C bên trong để ra góc ngoài."]'::jsonb, 30),

  (v_test_id, 'input', 'Góc đỉnh tam giác cân là 150°. Góc đáy?', '15', 'tu', 'tamgiaccan',
    '["","","Lấy 180 độ trừ đi góc đỉnh, sau đó lấy kết quả chia đều làm hai phần."]'::jsonb, 31),

  (v_test_id, 'input', 'Hai góc nhọn của tam giác vuông cân cộng lại bằng?', '90', 'vuongcan', 'tamgiacvuong',
    '["","","Tam giác vuông đã chiếm mất phần vuông rồi, phần còn lại dành cho hai góc nhọn là bao nhiêu?"]'::jsonb, 32),

  (v_test_id, 'input', 'Góc X=20°, Y=30°. Góc Z?', '130', 'tu', 'tong3goc',
    '["","","Em hãy tính tổng của X và Y trước, sau đó dùng công thức tổng 3 góc."]'::jsonb, 33),

  (v_test_id, 'input', 'Tam giác vuông có góc 45°. Góc nhọn còn lại?', '45', 'vuongcan', 'tamgiacvuong',
    '["","","Áp dụng quy tắc tổng hai góc nhọn để thực hiện phép trừ nhé."]'::jsonb, 34),

  (v_test_id, 'input', 'Tam giác cân có góc đỉnh 90°. Góc đáy?', '45', 'vuongcan', 'tamgiaccan',
    '["","","Lấy 180 độ trừ đi góc đỉnh, rồi đem chia đều làm hai góc đáy."]'::jsonb, 35),

  (v_test_id, 'input', 'Góc ngoài tam giác là 150°. Góc kề bù bên trong?', '30', 'thuong', 'gocbet',
    '["","","Góc kề bù tạo thành một đường thẳng. Em hãy lấy 180 độ trừ đi góc ngoài."]'::jsonb, 36),

  (v_test_id, 'input', 'Tam giác đều. Tổng 2 góc là?', '120', 'deu', 'tamgiacdeu',
    '["","","Nhớ lại góc của tam giác đều bằng bao nhiêu, lấy số đó cộng với chính nó."]'::jsonb, 37),

  (v_test_id, 'input', 'A=100°, B=40°. C=?', '40', 'tu', 'tong3goc',
    '["","","Hãy thử gộp hai góc đã biết lại, rồi làm phép trừ với 180."]'::jsonb, 38),

  (v_test_id, 'input', 'Tam giác A=B=70°. C=?', '40', 'can', 'tong3goc',
    '["","","Tính tổng hai góc đã biết trước, rồi lấy 180 độ trừ đi tổng đó."]'::jsonb, 39),

  (v_test_id, 'input', 'Góc bẹt 180° chia 3 phần bằng nhau. Mỗi phần?', '60', 'thuong', 'gocbet',
    '["","","Đây là một phép tính chia vô cùng cơ bản. Lấy tổng góc bẹt chia 3."]'::jsonb, 40);

  RAISE NOTICE 'Done! test_id = %', v_test_id;
END $$;
