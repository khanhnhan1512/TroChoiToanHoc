import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConfirm, useAlert } from '../components/ConfirmDialog'
import {
  getGrades, getSubjects, createSubject, updateSubject, deleteSubject,
  getTests, createTest, updateTest, deleteTest, togglePublish,
} from '../hooks/useTests'

const SUBJECT_ICONS = ['📚', '📐', '📝', '🔬', '🌍', '📖', '🎵', '🎨', '💻', '🧮', '🇬🇧', '🇻🇳']

export default function TeacherDashboard() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  // Subject form
  const [showSubjForm, setShowSubjForm] = useState(false)
  const [subjName, setSubjName] = useState('')
  const [subjIcon, setSubjIcon] = useState('📚')
  const [subjGradeId, setSubjGradeId] = useState('')
  const [editingSubj, setEditingSubj] = useState(null)

  // Test form
  const [showTestForm, setShowTestForm] = useState(null) // subjectId or null
  const [testTitle, setTestTitle] = useState('')
  const [testDesc, setTestDesc] = useState('')
  const [editingTest, setEditingTest] = useState(null)
  const [editTestTitle, setEditTestTitle] = useState('')
  const [editTestDesc, setEditTestDesc] = useState('')

  // Expanded subjects
  const [expanded, setExpanded] = useState({})
  const { confirm, ConfirmDialog } = useConfirm()
  const { alert, AlertDialog } = useAlert()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      setLoading(true)
      const [g, s, t] = await Promise.all([getGrades(), getSubjects(), getTests()])
      setGrades(g)
      setSubjects(s)
      setTests(t)
      // auto-expand all
      const ex = {}; s.forEach(sub => ex[sub.id] = true)
      setExpanded(ex)
    } catch (err) {
      await alert({ title: 'Lỗi tải dữ liệu', message: err.message, icon: '❌' })
    } finally {
      setLoading(false)
    }
  }

  function testsOfSubject(subId) { return tests.filter(t => t.subject_id === subId) }
  function toggle(id) { setExpanded(e => ({ ...e, [id]: !e[id] })) }

  // ==== Subject CRUD ====
  async function handleCreateSubject(e) {
    e.preventDefault()
    if (!subjName.trim()) return alert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập tên môn học.', icon: '⚠️' })
    try {
      const s = await createSubject(subjName.trim(), subjIcon, subjGradeId || null)
      setSubjects([...subjects, s])
      setExpanded(e => ({ ...e, [s.id]: true }))
      setSubjName(''); setSubjIcon('📚'); setSubjGradeId(''); setShowSubjForm(false)
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleEditSubject(e) {
    e.preventDefault()
    try {
      const updated = await updateSubject(editingSubj.id, { name: subjName.trim(), icon: subjIcon, grade_id: subjGradeId || null })
      setSubjects(subjects.map(s => s.id === editingSubj.id ? updated : s))
      setEditingSubj(null); setSubjName(''); setSubjIcon('📚'); setSubjGradeId('')
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleDeleteSubject(sub) {
    const count = testsOfSubject(sub.id).length
    const ok = await confirm({
      title: `Xóa môn "${sub.name}"?`,
      message: count > 0 ? `Môn học này có ${count} bài test. Tất cả sẽ bị xóa theo.` : 'Hành động này không thể hoàn tác.',
      confirmText: 'Xóa môn học',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteSubject(sub.id)
      setSubjects(subjects.filter(s => s.id !== sub.id))
      setTests(tests.filter(t => t.subject_id !== sub.id))
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  // ==== Test CRUD ====
  async function handleCreateTest(e, subjectId) {
    e.preventDefault()
    if (!testTitle.trim()) return alert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập tên bài test.', icon: '⚠️' })
    try {
      const t = await createTest(testTitle.trim(), testDesc.trim(), subjectId)
      setTests([t, ...tests])
      setTestTitle(''); setTestDesc(''); setShowTestForm(null)
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleTogglePublish(test) {
    try {
      const updated = await togglePublish(test.id, test.is_published)
      setTests(tests.map(t => t.id === test.id ? updated : t))
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleDeleteTest(test) {
    const ok = await confirm({
      title: `Xóa bài test?`,
      message: `"${test.title}" và toàn bộ câu hỏi bên trong sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa bài test',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteTest(test.id)
      setTests(tests.filter(t => t.id !== test.id))
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleEditTestSave(e) {
    e.preventDefault()
    if (!editTestTitle.trim()) return
    try {
      const updated = await updateTest(editingTest.id, { title: editTestTitle.trim(), description: editTestDesc.trim() })
      setTests(tests.map(t => t.id === editingTest.id ? updated : t))
      setEditingTest(null)
    } catch (err) { await alert({ title: 'Lỗi', message: err.message, icon: '❌' }) }
  }

  async function handleSignOut() { await signOut(); navigate('/') }

  return (
    <>
    <div className="game-wrapper">
      <div className="game-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 16, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text)' }}>👩‍🏫 Bảng Quản Lý</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{session?.user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-small" style={{ background: 'var(--secondary)', color: 'white' }} onClick={() => navigate('/')}>🏠 Trang chủ</button>
            <button className="btn-small btn-cancel" onClick={handleSignOut}>Đăng xuất</button>
          </div>
        </div>

        {/* Nút tạo môn */}
        {!showSubjForm && !editingSubj ? (
          <button className="btn-small btn-success" style={{ marginBottom: 20, fontSize: 15 }} onClick={() => setShowSubjForm(true)}>
            ➕ Thêm Môn Học
          </button>
        ) : (
          <form onSubmit={editingSubj ? handleEditSubject : handleCreateSubject}
            style={{ background: '#f8f9fa', padding: 16, borderRadius: 10, marginBottom: 20, border: '2px dashed var(--success)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text)', fontSize: 16 }}>
              {editingSubj ? 'Sửa Môn Học' : 'Thêm Môn Học Mới'}
            </h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
                <label>Tên môn</label>
                <input type="text" className="form-control" value={subjName} onChange={e => setSubjName(e.target.value)}
                  placeholder="VD: Toán học" autoFocus />
              </div>
              <div className="form-group" style={{ flex: '0 1 130px', marginBottom: 0 }}>
                <label>Khối lớp</label>
                <select className="form-control" value={subjGradeId} onChange={e => setSubjGradeId(e.target.value)}>
                  <option value="">-- Chưa xếp --</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Icon</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {SUBJECT_ICONS.map(ic => (
                    <button key={ic} type="button"
                      onClick={() => setSubjIcon(ic)}
                      style={{
                        fontSize: 22, padding: '4px 6px', border: subjIcon === ic ? '3px solid var(--primary)' : '2px solid #ccc',
                        borderRadius: 8, cursor: 'pointer', background: subjIcon === ic ? '#fff3e0' : 'white'
                      }}>{ic}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn-small btn-success">{editingSubj ? 'Lưu' : 'Tạo'}</button>
              <button type="button" className="btn-small btn-cancel" onClick={() => { setShowSubjForm(false); setEditingSubj(null); setSubjName(''); setSubjIcon('📚'); setSubjGradeId('') }}>Hủy</button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải...</div>}

        {/* Empty */}
        {!loading && subjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#888' }}>Chưa có môn học nào. Hãy thêm môn học đầu tiên!</p>
          </div>
        )}

        {/* Subject list */}
        {!loading && subjects.map(sub => (
          <div key={sub.id} style={{ marginBottom: 16, border: '2px solid #e0e0e0', borderRadius: 12, overflow: 'hidden' }}>
            {/* Subject header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}
              onClick={() => toggle(sub.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{sub.icon}</span>
                <strong style={{ fontSize: 17, color: 'var(--text)' }}>{sub.name}</strong>
                {sub.grades && (
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 'bold' }}>
                    {sub.grades.name}
                  </span>
                )}
                <span style={{ fontSize: 13, color: '#888' }}>({testsOfSubject(sub.id).length} bài test)</span>
                <span style={{ fontSize: 12, color: '#aaa' }}>{expanded[sub.id] ? '▼' : '▶'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button className="btn-small btn-edit" style={{ fontSize: 12, padding: '6px 10px' }}
                  onClick={() => { setEditingSubj(sub); setSubjName(sub.name); setSubjIcon(sub.icon); setSubjGradeId(sub.grade_id || ''); setShowSubjForm(false) }}>✏️</button>
                <button className="btn-small" style={{ background: '#dc3545', color: 'white', fontSize: 12, padding: '6px 10px' }}
                  onClick={() => handleDeleteSubject(sub)}>🗑️</button>
              </div>
            </div>

            {/* Tests inside subject */}
            {expanded[sub.id] && (
              <div style={{ padding: '12px 16px', background: 'white' }}>
                {/* Add test button */}
                {showTestForm !== sub.id ? (
                  <button className="btn-small btn-success" style={{ fontSize: 13, marginBottom: 12 }}
                    onClick={() => { setShowTestForm(sub.id); setTestTitle(''); setTestDesc('') }}>
                    ➕ Thêm Bài Test
                  </button>
                ) : (
                  <form onSubmit={(e) => handleCreateTest(e, sub.id)}
                    style={{ background: '#eef7ee', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px dashed var(--success)' }}>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input type="text" className="form-control" value={testTitle} onChange={e => setTestTitle(e.target.value)}
                        placeholder="Tên bài test..." autoFocus />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <input type="text" className="form-control" value={testDesc} onChange={e => setTestDesc(e.target.value)}
                        placeholder="Mô tả (tùy chọn)..." />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="submit" className="btn-small btn-success" style={{ fontSize: 13 }}>Tạo</button>
                      <button type="button" className="btn-small btn-cancel" style={{ fontSize: 13 }}
                        onClick={() => setShowTestForm(null)}>Hủy</button>
                    </div>
                  </form>
                )}

                {/* Test list */}
                {testsOfSubject(sub.id).length === 0 && showTestForm !== sub.id && (
                  <p style={{ color: '#aaa', fontSize: 14, margin: '8px 0 0' }}>Chưa có bài test nào.</p>
                )}

                {testsOfSubject(sub.id).map(test => (
                  <div key={test.id} className="q-item" style={{ marginBottom: 8 }}>
                    {editingTest?.id === test.id ? (
                      <form onSubmit={handleEditTestSave} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <input type="text" className="form-control" value={editTestTitle} onChange={e => setEditTestTitle(e.target.value)} />
                        </div>
                        <input type="text" className="form-control" value={editTestDesc} onChange={e => setEditTestDesc(e.target.value)}
                          placeholder="Mô tả..." style={{ marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="submit" className="btn-small btn-success" style={{ fontSize: 12 }}>Lưu</button>
                          <button type="button" className="btn-small btn-cancel" style={{ fontSize: 12 }} onClick={() => setEditingTest(null)}>Hủy</button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--text)' }}>{test.title}</strong>
                            <span style={{
                              background: test.is_published ? 'var(--success)' : '#6c757d',
                              color: 'white', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 'bold'
                            }}>
                              {test.is_published ? '🟢 Hiện' : '⚫ Ẩn'}
                            </span>
                          </div>
                          {test.description && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{test.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                          <button className="btn-small" style={{ background: test.is_published ? '#6c757d' : 'var(--success)', color: 'white', fontSize: 12, padding: '5px 8px' }}
                            onClick={() => handleTogglePublish(test)}>
                            {test.is_published ? '🙈 Ẩn' : '👁️ Hiện'}
                          </button>
                          <button className="btn-small" style={{ background: 'var(--secondary)', color: 'white', fontSize: 12, padding: '5px 8px' }}
                            onClick={() => navigate(`/teacher/test/${test.id}`)}>📝 Câu hỏi</button>
                          <button className="btn-small btn-edit" style={{ fontSize: 12, padding: '5px 8px' }}
                            onClick={() => { setEditingTest(test); setEditTestTitle(test.title); setEditTestDesc(test.description || '') }}>✏️</button>
                          <button className="btn-small" style={{ background: '#dc3545', color: 'white', fontSize: 12, padding: '5px 8px' }}
                            onClick={() => handleDeleteTest(test)}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    <ConfirmDialog />
    <AlertDialog />
    </>
  )
}
