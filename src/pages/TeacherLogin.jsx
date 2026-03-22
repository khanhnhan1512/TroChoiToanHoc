import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function TeacherLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Email hoặc mật khẩu không đúng!')
    } else {
      navigate('/teacher/dashboard')
    }
  }

  return (
    <div className="game-wrapper">
      <div className="game-container" style={{ maxWidth: 450, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24 }}>👩‍🏫 Đăng nhập Giáo viên</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Chỉ dành cho Thầy/Cô quản lý bài test</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <div className="feedback-box hint" style={{ display: 'block', marginBottom: 16 }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-action"
            disabled={loading}
            style={{ fontSize: 18, padding: '12px 32px' }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập 🔑'}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <a href="/" style={{ color: '#219ebc', textDecoration: 'none', fontSize: 14 }}>
            ← Về trang học sinh
          </a>
        </div>
      </div>
    </div>
  )
}
