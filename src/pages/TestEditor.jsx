import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTests } from '../hooks/useTests'
import { getQuestions, saveQuestion, deleteQuestion } from '../hooks/useTests'
import QuestionForm from '../components/QuestionForm'
import { generateTriangleSVG } from '../lib/gameLogic'

export default function TestEditor() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)

  useEffect(() => { loadData() }, [testId])

  async function loadData() {
    try {
      setLoading(true)
      const [allTests, qs] = await Promise.all([getTests(), getQuestions(testId)])
      const found = allTests.find((t) => t.id === testId)
      setTest(found)
      setQuestions(qs)
    } catch (err) {
      alert('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(qData) {
    const saved = await saveQuestion(qData)
    if (qData.id) {
      setQuestions(questions.map((q) => (q.id === saved.id ? saved : q)))
    } else {
      setQuestions([...questions, saved])
    }
  }

  async function handleDelete(q) {
    if (!confirm(`Xóa câu hỏi: "${q.question_text}"?`)) return
    await deleteQuestion(q.id)
    setQuestions(questions.filter((x) => x.id !== q.id))
  }

  function openAdd() { setEditingQuestion(null); setShowForm(true) }
  function openEdit(q) { setEditingQuestion(q); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingQuestion(null) }

  return (
    <div className="game-wrapper">
      <div className="game-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 14, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button
              className="btn-small btn-cancel"
              style={{ marginBottom: 8, fontSize: 13 }}
              onClick={() => navigate('/teacher/dashboard')}
            >
              ← Về Dashboard
            </button>
            <h2 style={{ margin: 0, color: 'var(--text)' }}>
              📝 Quản lý câu hỏi
            </h2>
            {test && <p style={{ margin: '4px 0 0', color: 'var(--primary)', fontWeight: 'bold' }}>{test.title}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#888' }}>{questions.length} câu hỏi</span>
            <button className="btn-small btn-success" style={{ fontSize: 15 }} onClick={openAdd}>
              ➕ Thêm câu hỏi
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải...</div>
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#888' }}>Bài test này chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!</p>
            <button className="btn-small btn-success" onClick={openAdd}>➕ Thêm câu hỏi</button>
          </div>
        ) : (
          <div className="q-list">
            {questions.map((q, i) => (
              <div key={q.id} className="q-item">
                <div className="q-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong>Câu {i + 1}:</strong>
                    <span style={{ background: q.type === 'image' ? '#8ecae6' : '#ffb703', color: 'var(--text)', padding: '1px 8px', borderRadius: 10, fontSize: 12 }}>
                      {q.type === 'image' ? 'Chọn Hình' : 'Nhập Số'}
                    </span>
                    <span style={{ fontSize: 14 }}>{q.question_text}</span>
                  </div>

                  <p style={{ color: 'var(--success)', margin: '4px 0', fontSize: 14 }}>
                    Đáp án:{' '}
                    {q.type === 'image' && q.image_mode === 'upload'
                      ? '[Ảnh Upload]'
                      : q.type === 'image'
                      ? <span dangerouslySetInnerHTML={{ __html: generateTriangleSVG(q.answer, 40, 30) }} />
                      : `${q.answer}°`}
                    {q.type === 'input' && ` (${q.explanation_key})`}
                  </p>

                  <div style={{ fontSize: 13, color: '#666', background: '#f1f1f1', padding: '6px 10px', borderRadius: 6 }}>
                    <div>G1: {q.hints?.[0]}</div>
                    <div>G2: {q.hints?.[1]}</div>
                    <div style={{ color: 'var(--error)', fontWeight: 'bold' }}>G3: {q.hints?.[2]}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button className="btn-small btn-edit" onClick={() => openEdit(q)}>✏️ Sửa</button>
                  <button className="btn-small" style={{ background: '#dc3545', color: 'white' }} onClick={() => handleDelete(q)}>
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <QuestionForm
            testId={testId}
            question={editingQuestion}
            onSave={handleSave}
            onClose={closeForm}
          />
        )}
      </div>
    </div>
  )
}
