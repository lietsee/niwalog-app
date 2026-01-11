import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Employee, SalaryType } from '@/lib/types'

interface EmployeeCardProps {
  employee: Employee
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

const salaryTypeLabels: Record<SalaryType, string> = {
  hourly: '時給',
  daily: '日給月給',
  monthly: '月給',
}

const salaryTypeVariants: Record<SalaryType, 'default' | 'secondary' | 'outline'> = {
  hourly: 'default',
  daily: 'secondary',
  monthly: 'outline',
}

export function EmployeeCard({
  employee,
  onEdit,
  onDelete,
}: EmployeeCardProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return `${amount.toLocaleString()}円`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{employee.employee_code}</Badge>
              <Badge variant={salaryTypeVariants[employee.salary_type]}>
                {salaryTypeLabels[employee.salary_type]}
              </Badge>
            </div>

            <h3 className="font-semibold text-lg mb-2">{employee.name}</h3>

            <div className="text-sm text-muted-foreground space-y-1">
              {employee.salary_type === 'hourly' ? (
                <p>時給: {formatCurrency(employee.hourly_rate)}</p>
              ) : (
                <p>日給: {formatCurrency(employee.daily_rate)}</p>
              )}
            </div>
          </div>

          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(employee)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(employee)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
