import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTests } from '../hooks/useTests'

export default function StudentLobby() {
  const [mode, setMode] = useState(null) // null | 'student' | 'teacher'
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleChooseStudent() {
    setMode('student')
    setLoading(true)
    getTests(true)
      .then(setTests)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  function handleChooseTeacher() {
    navigate('/teacher/login')
  }

  return (
    <div className="game-wrapper">
      <div className="game-container">
        <h1>🐪 MẬT MÃ KIM TỰ THÁP 🐪</h1>

        <div className="ai-box">
          <div className="ai-avatar">🤖</div>
          <div className="ai-bubble">
            <b>"Chào mừng đến với trò chơi Mật Mã Kim Tự Tháp thú vị và sinh động nhất!"</b>
            <br /><br />
            Bạn là <b>Học sinh</b> muốn làm bài, hay <b>Giáo viên</b> muốn quản lý bài test?
          </div>
        </div>

        {/* Chọn vai trò */}
        {mode === null && (
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <RoleCard
              emoji="🎒"
              title="Học sinh"
              desc="Xem và làm các bài test đang mở"
              color="var(--secondary)"
              shadow="#1a7f9e"
              onClick={handleChooseStudent}
            />
            <RoleCard
              emoji="👩‍🏫"
              title="Giáo viên"
              desc="Đăng nhập để quản lý bài test"
              color="var(--primary)"
              shadow="#e85d04"
              onClick={handleChooseTeacher}
            />
          </div>
        )}

        {/* Danh sách bài test */}
        {mode === 'student' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '2px solid #eee', paddingBottom: 12 }}>
              <button
                onClick={() => setMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 0, color: 'var(--secondary)' }}
                title="Quay lại"
              >
                ←
              </button>
              <h2 style={{ color: 'var(--text)', margin: 0 }}>📋 Chọn bài test</h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Đang tải bài test...</div>
            ) : tests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#888' }}>Hiện chưa có bài test nào. Thầy/Cô sẽ đăng bài sớm nhé!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {tests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => navigate(`/test/${test.id}`)}
                    style={{
                      background: 'white',
                      border: '3px solid #ffb703',
                      borderRadius: 16,
                      padding: '20px 22px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                    <h3 style={{ color: 'var(--primary)', margin: '0 0 8px', fontSize: 18 }}>{test.title}</h3>
                    {test.description && (
                      <p style={{ color: '#666', fontSize: 14, margin: '0 0 14px' }}>{test.description}</p>
                    )}
                    <button className="btn-small" style={{ background: 'var(--primary)', color: 'white', width: '100%' }}>
                      Bắt đầu làm bài →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RoleCard({ emoji, title, desc, color, shadow, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'white',
        border: `4px solid ${color}`,
        borderRadius: 20,
        padding: '28px 36px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: `0 6px 0 ${shadow}`,
        minWidth: 200,
        textAlign: 'center',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 0 ${shadow}` }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}` }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(6px)'; e.currentTarget.style.boxShadow = '0 0 0 transparent' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}` }}
    >
      <div style={{ fontSize: 52, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: '#666', fontWeight: 'normal' }}>{desc}</div>
    </button>
  )
}
