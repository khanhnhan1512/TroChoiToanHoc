import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTests, getQuestions, saveQuestion, deleteQuestion } from '../hooks/useTests'
import QuestionForm from '../components/QuestionForm'
import AiChatPanel from '../components/AiChatPanel'
import { useConfirm } from '../components/ConfirmDialog'
import { generateTriangleSVG, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '../lib/gameLogic'

export default function TestEditor() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [activeTab, setActiveTab] = useState('questions') // 'questions' | 'ai'
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => { loadData() }, [testId])

  async function loadData() {
    try {
      setLoading(true)
      const [allTests, qs] = await Promise.all([getTests(), getQuestions(testId)])
      setTest(allTests.find(t => t.id === testId))
      setQuestions(qs)
    } catch (err) { alert('Lỗi: ' + err.message) }
    finally { setLoading(false) }
  }

  async function handleSave(qData) {
    const saved = await saveQuestion(qData)
    if (qData.id) setQuestions(questions.map(q => q.id === saved.id ? saved : q))
    else setQuestions([...questions, saved])
  }

  async function handleDelete(q) {
    const ok = await confirm({
      title: 'Xóa câu hỏi?',
      message: `"${q.question_text}"`,
      confirmText: 'Xóa',
      danger: true,
    })
    if (!ok) return
    await deleteQuestion(q.id)
    setQuestions(questions.filter(x => x.id !== q.id))
  }

  function openAdd() { setEditingQuestion(null); setShowForm(true) }
  function openEdit(q) { setEditingQuestion(q); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingQuestion(null) }

  function renderAnswerPreview(q) {
    switch (q.type) {
      case 'multiple_choice': {
        const idx = parseInt(q.answer)
        return q.options?.[idx] ? `${String.fromCharCode(65 + idx)}. ${q.options[idx]}` : q.answer
      }
      case 'fill_text': return `"${q.answer}"`
      case 'true_false': return q.answer === 'true' ? 'Đúng' : 'Sai'
      case 'ordering': {
        try {
          const arr = JSON.parse(q.answer)
          return arr.map((s, i) => `${i + 1}. ${s}`).join(' → ')
        } catch { return q.answer }
      }
      case 'image':
        if (q.image_mode === 'upload') return '[Ảnh Upload]'
        return <span dangerouslySetInnerHTML={{ __html: generateTriangleSVG(q.answer, 40, 30) }} />
      case 'input':
        return `${q.answer}° (${q.explanation_key})`
      default: return q.answer
    }
  }

  return (
    <>
    <div className="game-wrapper">
      <div className="game-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 14, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button className="btn-small btn-cancel" style={{ marginBottom: 8, fontSize: 13 }}
              onClick={() => navigate('/teacher/dashboard')}>← Về Dashboard</button>
            <h2 style={{ margin: 0, color: 'var(--text)' }}>📝 Quản lý câu hỏi</h2>
            {test && <p style={{ margin: '4px 0 0', color: 'var(--primary)', fontWeight: 'bold' }}>{test.title}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#888' }}>{questions.length} câu hỏi</span>
            {activeTab === 'questions' && (
              <button className="btn-small btn-success" style={{ fontSize: 15 }} onClick={openAdd}>➕ Thêm câu hỏi</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #eee' }}>
          {[
            { key: 'questions', label: '📋 Danh sách câu hỏi' },
            { key: 'ai', label: '🤖 Tạo bằng AI' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                color: activeTab === tab.key ? 'var(--primary)' : '#888',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2,
                fontSize: 14,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Questions */}
        {activeTab === 'questions' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải...</div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#888' }}>Bài test này chưa có câu hỏi nào.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                <button className="btn-small btn-success" onClick={openAdd}>➕ Thêm thủ công</button>
                <button className="btn-small" style={{ background: 'var(--primary)', color: 'white' }} onClick={() => setActiveTab('ai')}>🤖 Tạo bằng AI</button>
              </div>
            </div>
          ) : (
            <div className="q-list">
              {questions.map((q, i) => (
                <div key={q.id} className="q-item">
                  <div className="q-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <strong>Câu {i + 1}:</strong>
                      <span style={{
                        background: QUESTION_TYPE_COLORS[q.type] || '#ccc',
                        color: 'white', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 'bold'
                      }}>
                        {QUESTION_TYPE_LABELS[q.type] || q.type}
                      </span>
                      <span style={{ fontSize: 14 }}>{q.question_text}</span>
                    </div>

                    <p style={{ color: 'var(--success)', margin: '4px 0', fontSize: 14 }}>
                      Đáp án: {renderAnswerPreview(q)}
                    </p>

                    {q.type === 'multiple_choice' && q.options && (
                      <div style={{ fontSize: 12, color: '#666', margin: '2px 0 4px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {q.options.map((opt, j) => (
                          <span key={j} style={{
                            background: String(j) === q.answer ? '#d4edda' : '#f1f1f1',
                            padding: '2px 8px', borderRadius: 6,
                            border: String(j) === q.answer ? '1px solid var(--success)' : '1px solid #ddd'
                          }}>{String.fromCharCode(65 + j)}. {opt}</span>
                        ))}
                      </div>
                    )}

                    {q.hints && q.hints.some(Boolean) && (
                      <div style={{ fontSize: 12, color: '#666', background: '#f1f1f1', padding: '4px 8px', borderRadius: 6, marginTop: 4 }}>
                        {q.hints.map((h, j) => h ? <div key={j}>G{j + 1}: {h}</div> : null)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    <button className="btn-small btn-edit" onClick={() => openEdit(q)}>✏️ Sửa</button>
                    <button className="btn-small" style={{ background: '#dc3545', color: 'white' }} onClick={() => handleDelete(q)}>🗑️ Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab: AI Chat */}
        {activeTab === 'ai' && (
          <AiChatPanel
            testId={testId}
            test={test}
            onQuestionsAdded={loadData}
          />
        )}

        {showForm && (
          <QuestionForm testId={testId} question={editingQuestion} onSave={handleSave} onClose={closeForm} />
        )}
      </div>
    </div>
    <ConfirmDialog />
    </>
  )
}
