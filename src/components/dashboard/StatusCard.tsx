import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ComponentType } from 'react'

interface StatusCardProps {
  title: string
  value: string | number
  unit?: string
  status: 'normal' | 'warning' | 'critical' | 'offline'
  icon: ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
}

const statusColors = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  offline: 'bg-gray-100 text-gray-800 border-gray-200'
}

const statusLabels = {
  normal: 'Normalno',
  warning: 'Upozorenje',
  critical: 'Kritično',
  offline: 'Offline'
}

export function StatusCard({ title, value, unit, status, icon: Icon, trend }: StatusCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {value}
              {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
            </div>
            {trend && (
              <p className={cn(
                'text-xs',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}% od prošle nedelje
              </p>
            )}
          </div>
          <Badge className={cn('text-xs', statusColors[status])}>
            {statusLabels[status]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}