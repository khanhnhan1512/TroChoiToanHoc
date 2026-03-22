import { useState, useEffect, useRef } from 'react'
import { getAiMessages, saveAiMessage, clearAiMessages, saveQuestion } from '../hooks/useTests'
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '../lib/gameLogic'
import { useConfirm, useAlert } from './ConfirmDialog'

export default function AiChatPanel({ testId, test, onQuestionsAdded }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingAll, setSavingAll] = useState(null) // msgIndex đang lưu tất cả
  const bottomRef = useRef(null)
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialog } = useAlert()

  useEffect(() => {
    loadHistory()
  }, [testId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadHistory() {
    try {
      setInitialLoading(true)
      const rows = await getAiMessages(testId)
      // Each row: { role, content } where content is the raw text
      // We need to parse assistant messages back to { text, questions }
      const parsed = rows.map(row => {
        if (row.role === 'assistant') {
          try {
            const data = JSON.parse(row.content)
            return { role: 'assistant', text: data.message || '', questions: data.questions || [], rawContent: row.content }
          } catch {
            return { role: 'assistant', text: row.content, questions: [], rawContent: row.content }
          }
        }
        return { role: 'user', text: row.content }
      })
      setMessages(parsed)
    } catch (err) {
      console.error('Lỗi tải lịch sử chat:', err)
    } finally {
      setInitialLoading(false)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Save user message to DB
      await saveAiMessage(testId, 'user', text)

      // Build messages array for API (only role+content, no extra fields)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.text }))

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          testContext: {
            title: test?.title || '',
            subject: test?.subject_name || '',
            grade: test?.grade_name || '',
            description: test?.description || '',
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Lỗi ${res.status}`)
      }

      const data = await res.json()
      const assistantMsg = {
        role: 'assistant',
        text: data.message || '',
        questions: data.questions || [],
        rawContent: JSON.stringify(data),
      }

      setMessages(prev => [...prev, assistantMsg])

      // Save assistant message to DB (store full JSON so we can reconstruct later)
      await saveAiMessage(testId, 'assistant', JSON.stringify(data))
    } catch (err) {
      const errMsg = { role: 'assistant', text: '❌ Lỗi: ' + err.message, questions: [] }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveQuestion(q, msgIndex, qIndex) {
    const key = `${msgIndex}-${qIndex}`
    try {
      await saveQuestion({
        test_id: testId,
        type: q.type,
        question_text: q.question_text,
        options: q.options || null,
        answer: String(q.answer),
        hints: q.hints || [],
        sort_order: Date.now(),
      })
      setSavedIds(prev => new Set([...prev, key]))
      onQuestionsAdded?.()
    } catch (err) {
      await alert({ title: 'Lỗi lưu câu hỏi', message: err.message, icon: '❌' })
    }
  }

  async function handleSaveAll(questions, msgIndex) {
    const unsaved = questions.filter((_, j) => !savedIds.has(`${msgIndex}-${j}`))
    if (!unsaved.length) return

    const ok = await confirm({
      title: 'Lưu tất cả câu hỏi?',
      message: `Sẽ lưu ${unsaved.length} câu hỏi chưa được lưu vào bài test.`,
      confirmText: 'Lưu tất cả',
    })
    if (!ok) return

    setSavingAll(msgIndex)
    let saved = 0
    for (let j = 0; j < questions.length; j++) {
      const key = `${msgIndex}-${j}`
      if (savedIds.has(key)) continue
      try {
        await saveQuestion({
          test_id: testId,
          type: questions[j].type,
          question_text: questions[j].question_text,
          options: questions[j].options || null,
          answer: String(questions[j].answer),
          hints: questions[j].hints || [],
          sort_order: Date.now() + j,
        })
        setSavedIds(prev => new Set([...prev, key]))
        saved++
      } catch { /* bỏ qua lỗi từng câu, tiếp tục */ }
    }
    setSavingAll(null)
    onQuestionsAdded?.()
    await alert({ title: 'Đã lưu xong!', message: `${saved}/${unsaved.length} câu hỏi đã được lưu vào bài test.`, icon: '✅' })
  }

  async function handleClear() {
    const ok = await confirm({
      title: 'Xóa lịch sử chat?',
      message: 'Toàn bộ cuộc trò chuyện với AI của bài test này sẽ bị xóa vĩnh viễn.',
      confirmText: 'Xóa lịch sử',
      danger: true,
    })
    if (!ok) return
    try {
      await clearAiMessages(testId)
      setMessages([])
      setSavedIds(new Set())
    } catch (err) {
      await alert({ title: 'Lỗi', message: err.message, icon: '❌' })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>🤖 Trợ lý AI</h3>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
            Yêu cầu AI tạo câu hỏi và lưu vào bài test
          </p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn-small"
            style={{ background: '#dc3545', color: 'white', fontSize: 12 }}
            onClick={handleClear}
          >
            🗑️ Xóa lịch sử
          </button>
        )}
      </div>

      {/* Chat messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 10,
        padding: 12,
        background: '#f8f9fa',
        marginBottom: 10,
        maxHeight: 460,
      }}>
        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>⏳ Đang tải lịch sử...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0, fontSize: 14 }}>Hãy nhắn tin để AI hỗ trợ tạo câu hỏi cho bài test này.</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#bbb' }}>VD: "Tạo 5 câu trắc nghiệm về phân số"</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {/* Bubble */}
              <div style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'var(--primary)' : 'white',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.role === 'assistant' && <span style={{ fontWeight: 'bold', marginRight: 4 }}>🤖</span>}
                  {msg.text || (msg.questions?.length > 0 ? `Đã tạo ${msg.questions.length} câu hỏi:` : '')}
                </div>
              </div>

              {/* Question cards */}
              {msg.role === 'assistant' && msg.questions?.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Save all button */}
                  {msg.questions.some((_, j) => !savedIds.has(`${i}-${j}`)) && (
                    <button
                      className="btn-small btn-success"
                      style={{ alignSelf: 'flex-start', fontSize: 12 }}
                      onClick={() => handleSaveAll(msg.questions, i)}
                      disabled={savingAll === i}
                    >
                      {savingAll === i ? '⏳ Đang lưu...' : `💾 Lưu tất cả (${msg.questions.filter((_, j) => !savedIds.has(`${i}-${j}`)).length} câu)`}
                    </button>
                  )}

                  {msg.questions.map((q, j) => {
                    const key = `${i}-${j}`
                    const isSaved = savedIds.has(key)
                    return (
                      <div key={j} style={{
                        background: 'white',
                        border: isSaved ? '1.5px solid var(--success)' : '1.5px solid #e0e0e0',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            background: QUESTION_TYPE_COLORS[q.type] || '#999',
                            color: 'white',
                            padding: '1px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 'bold',
                          }}>
                            {QUESTION_TYPE_LABELS[q.type] || q.type}
                          </span>
                          <strong style={{ flex: 1 }}>{q.question_text}</strong>
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {q.options.map((opt, k) => (
                              <span key={k} style={{
                                background: String(k) === String(q.answer) ? '#d4edda' : '#f1f1f1',
                                border: String(k) === String(q.answer) ? '1px solid var(--success)' : '1px solid #ddd',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                              }}>
                                {String.fromCharCode(65 + k)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.type !== 'multiple_choice' && (
                          <div style={{ fontSize: 12, color: '#28a745', marginBottom: 4 }}>
                            ✓ Đáp án: {q.type === 'true_false' ? (q.answer === 'true' ? 'Đúng' : 'Sai') : String(q.answer)}
                          </div>
                        )}

                        {q.hints && q.hints.some(Boolean) && (
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                            💡 {q.hints.filter(Boolean).join(' | ')}
                          </div>
                        )}

                        <button
                          className="btn-small btn-success"
                          style={{ fontSize: 12, opacity: isSaved ? 0.6 : 1 }}
                          onClick={() => !isSaved && handleSaveQuestion(q, i, j)}
                          disabled={isSaved}
                        >
                          {isSaved ? '✅ Đã lưu' : '💾 Lưu câu này'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
            <div style={{
              background: 'white',
              borderRadius: '16px 16px 16px 4px',
              padding: '10px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              fontSize: 14,
              color: '#888',
            }}>
              🤖 <span style={{ animation: 'pulse 1.2s infinite' }}>Đang suy nghĩ...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn tin cho AI... (Enter để gửi, Shift+Enter xuống dòng)"
          disabled={loading}
          rows={2}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1.5px solid #ddd',
            borderRadius: 10,
            fontSize: 14,
            resize: 'none',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = '#ddd'}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '0 18px',
            background: loading || !input.trim() ? '#ccc' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 20,
            transition: 'background 0.2s',
          }}
        >
          ➤
        </button>
      </div>

      <ConfirmDialog />
      <AlertDialog />
    </div>
  )
}
