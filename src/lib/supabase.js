import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'teacher-session',
  },
})

// Thời gian tối đa ghi nhớ đăng nhập: 14 ngày (ms)
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000
const LOGIN_TS_KEY = 'teacher-login-ts'

export function recordLoginTime() {
  localStorage.setItem(LOGIN_TS_KEY, String(Date.now()))
}

export function isSessionExpiredByAge() {
  const ts = localStorage.getItem(LOGIN_TS_KEY)
  if (!ts) return false // chưa có timestamp → không force logout
  return Date.now() - parseInt(ts) > SESSION_MAX_AGE_MS
}

export function clearLoginTime() {
  localStorage.removeItem(LOGIN_TS_KEY)
}
