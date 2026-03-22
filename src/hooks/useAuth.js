import { useState, useEffect } from 'react'
import { supabase, recordLoginTime, isSessionExpiredByAge, clearLoginTime } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isSessionExpiredByAge()) {
        // Quá 14 ngày kể từ lần login → tự động đăng xuất
        supabase.auth.signOut()
        clearLoginTime()
        setSession(null)
      } else {
        setSession(session)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (!result.error) recordLoginTime()
    return result
  }

  const signOut = async () => {
    clearLoginTime()
    return supabase.auth.signOut()
  }

  return { session, loading, signIn, signOut }
}
