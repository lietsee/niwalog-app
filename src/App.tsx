import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FieldListPage } from '@/pages/FieldListPage'
import { FieldFormPage } from '@/pages/FieldFormPage'
import { ProjectListPage } from '@/pages/ProjectListPage'
import { ProjectFormPage } from '@/pages/ProjectFormPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { WorkDayFormPage } from '@/pages/WorkDayFormPage'
import { ExpenseFormPage } from '@/pages/ExpenseFormPage'
import type { Page } from '@/lib/types'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(
    undefined
  )
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined
  )
  const [selectedWorkDayId, setSelectedWorkDayId] = useState<string | undefined>(
    undefined
  )
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | undefined>(
    undefined
  )

  const handleNavigate = (page: Page, id?: string) => {
    setCurrentPage(page)
    if (page === 'field-form') {
      setSelectedFieldId(id)
    } else if (page === 'project-list') {
      setSelectedFieldId(id)
      setSelectedProjectId(undefined)
    } else if (page === 'project-form') {
      setSelectedProjectId(id)
    } else if (page === 'project-detail') {
      setSelectedProjectId(id)
      setSelectedWorkDayId(undefined)
      setSelectedExpenseId(undefined)
    } else if (page === 'work-day-form') {
      setSelectedWorkDayId(id)
    } else if (page === 'expense-form') {
      setSelectedExpenseId(id)
    }
  }

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    return (
      <>
        <LoginPage onSuccess={() => handleNavigate('dashboard')} />
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {currentPage === 'dashboard' && (
          <DashboardPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'field-list' && (
          <FieldListPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'field-form' && (
          <FieldFormPage
            onNavigate={handleNavigate}
            fieldId={selectedFieldId}
          />
        )}
        {currentPage === 'project-list' && selectedFieldId && (
          <ProjectListPage
            fieldId={selectedFieldId}
            onBack={() => handleNavigate('field-list')}
            onCreateProject={() => handleNavigate('project-form')}
            onEditProject={(projectId) => handleNavigate('project-form', projectId)}
            onClickProject={(projectId) => handleNavigate('project-detail', projectId)}
          />
        )}
        {currentPage === 'project-form' && selectedFieldId && (
          <ProjectFormPage
            fieldId={selectedFieldId}
            projectId={selectedProjectId}
            onBack={() => handleNavigate('project-list', selectedFieldId)}
            onSuccess={() => handleNavigate('project-list', selectedFieldId)}
          />
        )}
        {currentPage === 'project-detail' && selectedProjectId && (
          <ProjectDetailPage
            projectId={selectedProjectId}
            onBack={() => handleNavigate('project-list', selectedFieldId)}
            onCreateWorkDay={() => handleNavigate('work-day-form')}
            onEditWorkDay={(workDayId) => handleNavigate('work-day-form', workDayId)}
            onCreateExpense={() => handleNavigate('expense-form')}
            onEditExpense={(expenseId) => handleNavigate('expense-form', expenseId)}
          />
        )}
        {currentPage === 'work-day-form' && selectedProjectId && (
          <WorkDayFormPage
            projectId={selectedProjectId}
            workDayId={selectedWorkDayId}
            onBack={() => handleNavigate('project-detail', selectedProjectId)}
            onSuccess={() => handleNavigate('project-detail', selectedProjectId)}
          />
        )}
        {currentPage === 'expense-form' && selectedProjectId && (
          <ExpenseFormPage
            projectId={selectedProjectId}
            expenseId={selectedExpenseId}
            onBack={() => handleNavigate('project-detail', selectedProjectId)}
            onSuccess={() => handleNavigate('project-detail', selectedProjectId)}
          />
        )}
      </div>
      <Toaster position="top-right" />
    </>
  )
}

export default App
