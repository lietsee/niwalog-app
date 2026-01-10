import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FieldListPage } from '@/pages/FieldListPage'
import { FieldFormPage } from '@/pages/FieldFormPage'
import type { Page } from '@/lib/types'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(
    undefined
  )

  const handleNavigate = (page: Page, fieldId?: string) => {
    setCurrentPage(page)
    setSelectedFieldId(fieldId)
  }

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setAuthed(true)
        setCurrentPage('field-list')
      }
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAuthed(true)
        setCurrentPage('field-list')
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
    return (
      <>
        <LoginPage onSuccess={() => handleNavigate('field-list')} />
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'field-list' && (
          <FieldListPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'field-form' && (
          <FieldFormPage
            onNavigate={handleNavigate}
            fieldId={selectedFieldId}
          />
        )}
        {/* 他のページは後で追加 */}
      </div>
      <Toaster position="top-right" />
    </>
  )
}

export default App
