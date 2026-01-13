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
import { EmployeeListPage } from '@/pages/EmployeeListPage'
import { EmployeeFormPage } from '@/pages/EmployeeFormPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { MonthlyCostPage } from '@/pages/MonthlyCostPage'
import { BusinessDaysPage } from '@/pages/BusinessDaysPage'
import type { Page } from '@/lib/types'

const NAV_STATE_KEY = 'niwalog_nav_state'

type NavigationState = {
  currentPage: Page
  selectedFieldId?: string
  selectedProjectId?: string
  selectedWorkDayId?: string
  selectedExpenseId?: string
  selectedEmployeeCode?: string
}

function getInitialNavState(): NavigationState | null {
  try {
    const saved = sessionStorage.getItem(NAV_STATE_KEY)
    if (saved) {
      return JSON.parse(saved) as NavigationState
    }
  } catch {
    // ignore parse errors
  }
  return null
}

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
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string | undefined>(
    undefined
  )

  const saveNavState = (state: NavigationState) => {
    try {
      sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(state))
    } catch {
      // ignore storage errors
    }
  }

  const handleNavigate = (page: Page, id?: string) => {
    setCurrentPage(page)

    let newFieldId = selectedFieldId
    let newProjectId = selectedProjectId
    let newWorkDayId = selectedWorkDayId
    let newExpenseId = selectedExpenseId
    let newEmployeeCode = selectedEmployeeCode

    if (page === 'field-form') {
      newFieldId = id
      setSelectedFieldId(id)
    } else if (page === 'project-list') {
      newFieldId = id
      newProjectId = undefined
      setSelectedFieldId(id)
      setSelectedProjectId(undefined)
    } else if (page === 'project-form') {
      newProjectId = id
      setSelectedProjectId(id)
    } else if (page === 'project-detail') {
      newProjectId = id
      newWorkDayId = undefined
      newExpenseId = undefined
      setSelectedProjectId(id)
      setSelectedWorkDayId(undefined)
      setSelectedExpenseId(undefined)
    } else if (page === 'work-day-form') {
      newWorkDayId = id
      setSelectedWorkDayId(id)
    } else if (page === 'expense-form') {
      newExpenseId = id
      setSelectedExpenseId(id)
    } else if (page === 'employee-form') {
      newEmployeeCode = id
      setSelectedEmployeeCode(id)
    }

    saveNavState({
      currentPage: page,
      selectedFieldId: newFieldId,
      selectedProjectId: newProjectId,
      selectedWorkDayId: newWorkDayId,
      selectedExpenseId: newExpenseId,
      selectedEmployeeCode: newEmployeeCode,
    })
  }

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setAuthed(true)
        // 保存された状態があれば復元、なければダッシュボード
        const savedState = getInitialNavState()
        if (savedState && savedState.currentPage !== 'login') {
          setCurrentPage(savedState.currentPage)
          setSelectedFieldId(savedState.selectedFieldId)
          setSelectedProjectId(savedState.selectedProjectId)
          setSelectedWorkDayId(savedState.selectedWorkDayId)
          setSelectedExpenseId(savedState.selectedExpenseId)
          setSelectedEmployeeCode(savedState.selectedEmployeeCode)
        } else {
          setCurrentPage('dashboard')
        }
      }
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAuthed(true)
        // 初回ログイン（SIGNED_IN）時のみダッシュボードに遷移
        // TOKEN_REFRESHED などのイベントでは遷移しない
        if (event === 'SIGNED_IN') {
          const saved = sessionStorage.getItem(NAV_STATE_KEY)
          if (!saved) {
            setCurrentPage('dashboard')
          }
        }
      } else {
        setAuthed(false)
        setCurrentPage('login')
        sessionStorage.removeItem(NAV_STATE_KEY)
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
        <Toaster position="top-center" closeButton />
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
        {currentPage === 'employee-list' && (
          <EmployeeListPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'employee-form' && (
          <EmployeeFormPage
            onNavigate={handleNavigate}
            employeeCode={selectedEmployeeCode}
          />
        )}
        {currentPage === 'analysis' && (
          <AnalysisPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'history' && (
          <HistoryPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'monthly-cost' && (
          <MonthlyCostPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'business-days' && (
          <BusinessDaysPage onNavigate={handleNavigate} />
        )}
      </div>
      <Toaster position="top-center" closeButton />
    </>
  )
}

export default App
