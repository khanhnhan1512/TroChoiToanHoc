/**
 * Vercel Serverless Function: /api/ai-chat
 * - Nhận lịch sử messages + context bài test từ browser
 * - Gọi OpenAI API (key chỉ nằm ở server, không lộ ra browser)
 * - Trả về response của AI
 *
 * Env var cần set trên Vercel dashboard: OPENAI_API_KEY
 */

export default async function handler(req, res) {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY chưa được cấu hình trên server.' })
  }

  const { messages, testContext } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Thiếu messages' })
  }

  const grade = testContext?.grade || ''
  const subject = testContext?.subject || ''
  const title = testContext?.title || ''
  const description = testContext?.description || ''

  // Xây dựng mô tả ngữ cảnh bài test
  const testLabel = [subject, grade].filter(Boolean).join(' - ') || 'Chưa rõ môn/khối'
  const levelNote = (grade && subject)
    ? `Mọi câu hỏi PHẢI bám sát chương trình ${subject} ${grade} theo sách giáo khoa Việt Nam hiện hành. Tuyệt đối không dùng kiến thức ngoài phạm vi ${grade} hoặc từ chương trình nước ngoài.`
    : subject
      ? `Mọi câu hỏi phải bám sát chương trình môn ${subject} trong sách giáo khoa Việt Nam hiện hành.`
      : 'Mọi câu hỏi phải bám sát chương trình giáo dục phổ thông Việt Nam hiện hành.'

  const systemPrompt = `Bạn là trợ lý giáo viên chuyên tạo câu hỏi kiểm tra theo chương trình giáo dục phổ thông Việt Nam.

=== NGỮ CẢNH BÀI TEST ===
Tên bài test : "${title || 'Chưa đặt tên'}"
Môn học      : "${subject || 'Chưa rõ'}"
Khối lớp     : "${grade || 'Chưa rõ'}"${description ? `\nMô tả        : "${description}"` : ''}

=== RÀNG BUỘC NỘI DUNG (BẮT BUỘC) ===
- ${levelNote}
- Kiến thức phải chính xác theo SGK Việt Nam, không sai lệch về khái niệm, số liệu, tên gọi.
- Độ khó phù hợp với học sinh${grade ? ` ${grade}` : ' phổ thông'}, không quá dễ cũng không vượt cấp.
- Dùng tên người, địa danh, đơn vị đo lường quen thuộc với học sinh Việt Nam.
- Ngôn ngữ rõ ràng, đúng văn phong SGK, không dịch máy.

=== QUY TẮC TRẢ LỜI ===
Khi tạo câu hỏi, chỉ trả về JSON (không thêm bất kỳ text nào bên ngoài):
{
  "questions": [
    {
      "type": "multiple_choice",
      "question_text": "Nội dung câu hỏi?",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "answer": "0",
      "hints": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]
    }
  ],
  "message": "Giải thích ngắn về bộ câu hỏi vừa tạo"
}

Các loại câu hỏi hợp lệ:
- "multiple_choice" : trắc nghiệm — "options" là mảng string, "answer" là index string ("0","1","2"...)
- "fill_text"       : điền vào chỗ trống — "answer" là chuỗi đáp án đúng, không có "options"
- "true_false"      : đúng/sai — "answer" là "true" hoặc "false", không có "options"
- "ordering"        : sắp xếp thứ tự — "options" là mảng ĐÃ XÁO TRỘN, "answer" là JSON string thứ tự đúng, VD: "[\"Bước 1\",\"Bước 2\",\"Bước 3\"]"

Khi giáo viên hỏi thông thường (không yêu cầu tạo câu hỏi):
{
  "questions": [],
  "message": "Câu trả lời của bạn"
}

Luôn trả lời bằng tiếng Việt.`

  // Inject nhắc nhở ngữ cảnh vào message user cuối cùng để AI không bị lạc đề
  const contextReminder = `[Nhắc: Bài test "${title}" — Môn: ${subject || '?'}, Khối: ${grade || '?'}. Câu hỏi phải đúng nội dung SGK Việt Nam cho ${testLabel}.]`
  const messagesWithContext = messages.map((m, i) =>
    (i === messages.length - 1 && m.role === 'user')
      ? { ...m, content: `${contextReminder}\n${m.content}` }
      : m
  )

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messagesWithContext,
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: errData?.error?.message || `OpenAI API lỗi: ${response.status}`,
      })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''

    // Parse JSON từ response AI
    let parsed
    try {
      // AI đôi khi wrap trong markdown code block, xử lý cả 2 trường hợp
      const jsonStr = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      // Nếu không parse được → coi như message thông thường không có câu hỏi
      parsed = { questions: [], message: rawContent }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server: ' + err.message })
  }
}
