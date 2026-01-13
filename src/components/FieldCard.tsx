import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, MapPin, User, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Field } from '@/lib/fieldsApi'
import type { FieldFinancialSummary } from '@/lib/types'

interface FieldCardProps {
  field: Field
  financialSummary?: FieldFinancialSummary
  onEdit: (field: Field) => void
  onDelete: (field: Field) => void
  onClick?: (field: Field) => void
}

export function FieldCard({ field, financialSummary, onEdit, onDelete, onClick }: FieldCardProps) {
  const handleCardClick = () => {
    onClick?.(field)
  }

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const handleLaborCostWarningClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toast.info('人件費が計算されていない案件があります')
  }

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`
  }

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{field.field_name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{field.field_code}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleButtonClick(e, () => onEdit(field))}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleButtonClick(e, () => onDelete(field))}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {field.customer_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{field.customer_name}</span>
            </div>
          )}
          {field.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{field.address}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1 pt-2">
            {field.has_electricity && (
              <Badge variant="outline" className="text-xs">
                電気
              </Badge>
            )}
            {field.has_water && (
              <Badge variant="outline" className="text-xs">
                水道
              </Badge>
            )}
            {field.has_toilet && (
              <Badge variant="outline" className="text-xs">
                トイレ
              </Badge>
            )}
          </div>
          {field.travel_distance_km !== null && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              移動距離: {field.travel_distance_km}km
              {field.travel_time_minutes && ` (${field.travel_time_minutes}分)`}
            </div>
          )}
          {financialSummary && financialSummary.projectCount > 0 && (
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">請求額合計</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(financialSummary.totalInvoice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">費用合計</span>
                <span className="font-medium text-red-600 flex items-center gap-1">
                  {formatCurrency(financialSummary.totalCost)}
                  {financialSummary.hasUnsetLaborCost && (
                    <button
                      onClick={handleLaborCostWarningClick}
                      className="text-amber-500 hover:text-amber-600"
                      title="人件費が計算されていない案件があります"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
