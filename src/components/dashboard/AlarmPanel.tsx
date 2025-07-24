import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Alarm } from '@/types'
import { cn } from '@/lib/utils'

interface AlarmPanelProps {
  alarms: Alarm[]
  onAcknowledge: (alarmId: string) => void
  onResolve: (alarmId: string) => void
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
}

const severityLabels = {
  low: 'Nizak',
  medium: 'Srednji',
  high: 'Visok',
  critical: 'Kritičan'
}

export function AlarmPanel({ alarms, onAcknowledge, onResolve }: AlarmPanelProps) {
  const activeAlarms = alarms.filter(alarm => alarm.status === 'active')
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
          Aktivni Alarmi ({activeAlarms.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeAlarms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
            <p>Nema aktivnih alarma</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlarms.slice(0, 5).map((alarm) => (
              <div key={alarm.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={cn('text-xs', severityColors[alarm.severity])}>
                        {severityLabels[alarm.severity]}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(alarm.triggeredAt).toLocaleString('sr-RS')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{alarm.message}</p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {alarm.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAcknowledge(alarm.id)}
                        >
                          Potvrdi
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onResolve(alarm.id)}
                        >
                          Reši
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {activeAlarms.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                i još {activeAlarms.length - 5} alarma...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}