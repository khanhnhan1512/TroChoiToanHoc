import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubjects, getTests } from '../hooks/useTests'

export default function StudentLobby() {
  const [mode, setMode] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleChooseStudent() {
    setMode('student')
    setLoading(true)
    Promise.all([getSubjects(), getTests(true)])
      .then(([subs, ts]) => { setSubjects(subs); setTests(ts) })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  function testsOfSubject(subId) { return tests.filter(t => t.subject_id === subId) }

  // Group: tests that have no subject (orphan)
  const orphanTests = tests.filter(t => !t.subject_id)
  // Subjects that have at least 1 published test
  const activeSubjects = subjects.filter(s => testsOfSubject(s.id).length > 0)

  return (
    <div className="game-wrapper">
      <div className="game-container">
        <h1>🐪 MẬT MÃ KIM TỰ THÁP 🐪</h1>

        <div className="ai-box">
          <div className="ai-avatar">🤖</div>
          <div className="ai-bubble">
            <b>"Chào mừng đến với trò chơi Mật Mã Kim Tự Tháp thú vị và sinh động nhất!"</b>
            <br /><br />
            {mode === null
              ? <>Bạn là <b>Học sinh</b> muốn làm bài, hay <b>Giáo viên</b> muốn quản lý bài test?</>
              : <>Hãy chọn một bài test bên dưới để bắt đầu thử thách! Trả lời đúng ngay = <b>10 điểm</b>. Cố lên! 💪</>
            }
          </div>
        </div>

        {/* Chọn vai trò */}
        {mode === null && (
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <RoleCard emoji="🎒" title="Học sinh" desc="Xem và làm các bài test đang mở"
              color="var(--secondary)" shadow="#1a7f9e" onClick={handleChooseStudent} />
            <RoleCard emoji="👩‍🏫" title="Giáo viên" desc="Đăng nhập để quản lý bài test"
              color="var(--primary)" shadow="#e85d04" onClick={() => navigate('/teacher/login')} />
          </div>
        )}

        {/* Danh sách bài test theo môn */}
        {mode === 'student' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '2px solid #eee', paddingBottom: 12 }}>
              <button onClick={() => setMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 0, color: 'var(--secondary)' }}>←</button>
              <h2 style={{ color: 'var(--text)', margin: 0 }}>📋 Chọn bài test</h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải...</div>
            ) : activeSubjects.length === 0 && orphanTests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#888' }}>Hiện chưa có bài test nào. Thầy/Cô sẽ đăng bài sớm nhé!</p>
              </div>
            ) : (
              <>
                {activeSubjects.map(sub => (
                  <div key={sub.id} style={{ marginBottom: 24 }}>
                    <h3 style={{ color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{sub.icon}</span> {sub.name}
                    </h3>
                    <TestGrid tests={testsOfSubject(sub.id)} navigate={navigate} />
                  </div>
                ))}
                {orphanTests.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    {activeSubjects.length > 0 && (
                      <h3 style={{ color: '#888', margin: '0 0 12px' }}>📋 Bài test khác</h3>
                    )}
                    <TestGrid tests={orphanTests} navigate={navigate} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TestGrid({ tests, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
      {tests.map(test => (
        <div key={test.id} onClick={() => navigate(`/test/${test.id}`)}
          style={{ background: 'white', border: '3px solid #ffb703', borderRadius: 16, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
          <h3 style={{ color: 'var(--primary)', margin: '0 0 6px', fontSize: 17 }}>{test.title}</h3>
          {test.description && <p style={{ color: '#666', fontSize: 13, margin: '0 0 12px' }}>{test.description}</p>}
          <button className="btn-small" style={{ background: 'var(--primary)', color: 'white', width: '100%' }}>Bắt đầu →</button>
        </div>
      ))}
    </div>
  )
}

function RoleCard({ emoji, title, desc, color, shadow, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: 'white', border: `4px solid ${color}`, borderRadius: 20, padding: '28px 36px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 6px 0 ${shadow}`, minWidth: 200, textAlign: 'center' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 0 ${shadow}` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}` }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(6px)'; e.currentTarget.style.boxShadow = '0 0 0 transparent' }}
      onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}` }}>
      <div style={{ fontSize: 52, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: '#666', fontWeight: 'normal' }}>{desc}</div>
    </button>
  )
}
