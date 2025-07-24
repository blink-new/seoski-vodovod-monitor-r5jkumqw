import { BarChart3, Home, AlertTriangle, Settings, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
  { id: 'alarms', label: 'Alarmi', icon: AlertTriangle },
  { id: 'reports', label: 'Izveštaji', icon: FileText },
  { id: 'settings', label: 'Podešavanja', icon: Settings },
]

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-r border-gray-200 w-64 min-h-screen p-4">
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start',
                activeTab === item.id && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </div>
    </nav>
  )
}