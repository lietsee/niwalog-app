import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'success' | 'destructive'
}

export function StatCard({ title, value, icon: Icon, description, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      valueText: '',
    },
    success: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      valueText: 'text-green-600',
    },
    destructive: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      valueText: 'text-red-600',
    },
  }

  const styles = variantStyles[variant]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold', styles.valueText)}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('rounded-full p-3', styles.bg)}>
            <Icon className={cn('h-6 w-6', styles.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
