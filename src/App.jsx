import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import StudentLobby from './pages/StudentLobby'
import TestPlayer from './pages/TestPlayer'
import TeacherLogin from './pages/TeacherLogin'
import TeacherDashboard from './pages/TeacherDashboard'
import TestEditor from './pages/TestEditor'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}>⏳</div>
  if (!session) return <Navigate to="/teacher/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentLobby />} />
        <Route path="/test/:testId" element={<TestPlayer />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/dashboard" element={
          <ProtectedRoute><TeacherDashboard /></ProtectedRoute>
        } />
        <Route path="/teacher/test/:testId" element={
          <ProtectedRoute><TestEditor /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
