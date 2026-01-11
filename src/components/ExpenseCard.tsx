import { Calendar, CircleDollarSign, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Expense } from '@/lib/types'

interface ExpenseCardProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium mb-1">{expense.expense_item}</h3>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center text-primary font-medium">
                <CircleDollarSign className="h-4 w-4 mr-1" />
                {formatAmount(expense.amount)}
              </div>

              {expense.expense_date && (
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(expense.expense_date)}
                </div>
              )}
            </div>

            {expense.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {expense.notes}
              </p>
            )}
          </div>

          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(expense)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(expense)}
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
