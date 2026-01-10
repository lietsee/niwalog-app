import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import type { Page } from '@/lib/types'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setAuthed(true)
        setCurrentPage('dashboard')
      }
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAuthed(true)
        setCurrentPage('dashboard')
      } else {
        setAuthed(false)
        setCurrentPage('login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!authed) {
    return <LoginPage onSuccess={() => setCurrentPage('dashboard')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage === 'dashboard' && <DashboardPage />}
      {/* 他のページは後で追加 */}
    </div>
  )
}

export default App
