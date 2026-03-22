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

  // System prompt: định nghĩa vai trò AI và format output câu hỏi
  const systemPrompt = `Bạn là một trợ lý giáo viên thông minh, chuyên hỗ trợ tạo câu hỏi cho bài kiểm tra.
Bài test hiện tại: "${testContext?.title || 'Không rõ tên'}"
Môn học: "${testContext?.subject || 'Không rõ môn'}"
Mô tả: "${testContext?.description || ''}"

Nhiệm vụ của bạn là giúp giáo viên tạo câu hỏi đa dạng và phù hợp với học sinh.

Khi được yêu cầu tạo câu hỏi, hãy trả lời bằng JSON có cấu trúc sau (và KHÔNG thêm gì khác ngoài JSON):
{
  "questions": [
    {
      "type": "multiple_choice",
      "question_text": "Câu hỏi ở đây?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "answer": "0",
      "hints": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]
    }
  ],
  "message": "Lời giải thích ngắn gọn về các câu hỏi vừa tạo"
}

Các loại câu hỏi hợp lệ:
- "multiple_choice": trắc nghiệm, "options" là mảng string, "answer" là index string ("0","1","2"...)
- "fill_text": điền đáp án, "answer" là chuỗi đáp án đúng, không cần "options"
- "true_false": đúng/sai, "answer" là "true" hoặc "false", không cần "options"
- "ordering": sắp xếp thứ tự, "options" là mảng các mục ĐÃ XÁO TRỘN, "answer" là JSON string của mảng thứ tự đúng VD: "[\"Bước 1\",\"Bước 2\"]"

Khi giáo viên chỉ hỏi thông thường (không yêu cầu tạo câu hỏi), trả về:
{
  "questions": [],
  "message": "Câu trả lời bình thường của bạn ở đây"
}

Luôn trả lời bằng tiếng Việt. Câu hỏi phải rõ ràng, phù hợp với lứa tuổi học sinh phổ thông.`

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
          ...messages,
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
