import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getTests, createTest, updateTest, deleteTest, togglePublish } from '../hooks/useTests'

export default function TeacherDashboard() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingTest, setEditingTest] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => { loadTests() }, [])

  async function loadTests() {
    try {
      setLoading(true)
      const data = await getTests()
      setTests(data)
    } catch (err) {
      alert('Lỗi tải danh sách: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitle.trim()) return alert('Vui lòng nhập tên bài test!')
    try {
      const t = await createTest(newTitle.trim(), newDesc.trim())
      setTests([t, ...tests])
      setNewTitle(''); setNewDesc(''); setShowNewForm(false)
    } catch (err) {
      alert('Lỗi tạo bài test: ' + err.message)
    }
  }

  async function handleTogglePublish(test) {
    try {
      const updated = await togglePublish(test.id, test.is_published)
      setTests(tests.map((t) => (t.id === test.id ? updated : t)))
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleDelete(test) {
    if (!confirm(`Xóa bài test "${test.title}"? Tất cả câu hỏi sẽ bị xóa.`)) return
    try {
      await deleteTest(test.id)
      setTests(tests.filter((t) => t.id !== test.id))
    } catch (err) {
      alert('Lỗi xóa: ' + err.message)
    }
  }

  async function handleEditSave(e) {
    e.preventDefault()
    if (!editTitle.trim()) return alert('Vui lòng nhập tên bài test!')
    try {
      const updated = await updateTest(editingTest.id, { title: editTitle.trim(), description: editDesc.trim() })
      setTests(tests.map((t) => (t.id === editingTest.id ? updated : t)))
      setEditingTest(null)
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="game-wrapper">
      <div className="game-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 16, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text)' }}>👩‍🏫 Bảng Quản Lý Bài Test</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{session?.user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-small" style={{ background: 'var(--secondary)', color: 'white' }} onClick={() => navigate('/')}>
              🏠 Trang học sinh
            </button>
            <button className="btn-small btn-cancel" onClick={handleSignOut}>
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Nút tạo mới */}
        {!showNewForm ? (
          <button className="btn-small btn-success" style={{ marginBottom: 20, fontSize: 16 }} onClick={() => setShowNewForm(true)}>
            ➕ Tạo Bài Test Mới
          </button>
        ) : (
          <form onSubmit={handleCreate} style={{ background: '#f8f9fa', padding: 20, borderRadius: 10, marginBottom: 20, border: '2px dashed var(--success)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Tạo Bài Test Mới</h3>
            <div className="form-group">
              <label>Tên bài test *</label>
              <input type="text" className="form-control" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Bài Test Tuần 3 - Tam Giác" autoFocus />
            </div>
            <div className="form-group">
              <label>Mô tả (tùy chọn)</label>
              <input type="text" className="form-control" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="VD: Ôn tập tổng 3 góc và tam giác đặc biệt" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-small btn-success">Tạo</button>
              <button type="button" className="btn-small btn-cancel" onClick={() => { setShowNewForm(false); setNewTitle(''); setNewDesc('') }}>Hủy</button>
            </div>
          </form>
        )}

        {/* Danh sách bài test */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải...</div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#888' }}>Chưa có bài test nào. Hãy tạo bài test đầu tiên!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tests.map((test) => (
              <div key={test.id} className="q-item" style={{ flexDirection: 'column', gap: 12 }}>
                {editingTest?.id === test.id ? (
                  <form onSubmit={handleEditSave}>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input type="text" className="form-control" value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input type="text" className="form-control" value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)} placeholder="Mô tả..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn-small btn-success">Lưu</button>
                      <button type="button" className="btn-small btn-cancel" onClick={() => setEditingTest(null)}>Hủy</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 17, color: 'var(--text)' }}>{test.title}</strong>
                        <span style={{
                          background: test.is_published ? 'var(--success)' : '#6c757d',
                          color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold'
                        }}>
                          {test.is_published ? '🟢 Đang hiển thị' : '⚫ Đã ẩn'}
                        </span>
                      </div>
                      {test.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>{test.description}</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                      <button
                        className="btn-small"
                        style={{ background: test.is_published ? '#6c757d' : 'var(--success)', color: 'white' }}
                        onClick={() => handleTogglePublish(test)}
                      >
                        {test.is_published ? '🙈 Ẩn bài' : '👁️ Hiện bài'}
                      </button>
                      <button
                        className="btn-small"
                        style={{ background: 'var(--secondary)', color: 'white' }}
                        onClick={() => navigate(`/teacher/test/${test.id}`)}
                      >
                        📝 Quản lý câu hỏi
                      </button>
                      <button
                        className="btn-small btn-edit"
                        onClick={() => { setEditingTest(test); setEditTitle(test.title); setEditDesc(test.description || '') }}
                      >
                        ✏️ Đổi tên
                      </button>
                      <button
                        className="btn-small"
                        style={{ background: '#dc3545', color: 'white' }}
                        onClick={() => handleDelete(test)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
