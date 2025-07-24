import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Navigation } from '@/components/layout/Navigation'
import { Dashboard } from '@/pages/Dashboard'
import Monitoring from '@/pages/Monitoring'
import Alarms from '@/pages/Alarms'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import { blink } from '@/blink/client'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeAlarms, setActiveAlarms] = useState(0)

  const loadActiveAlarms = useCallback(async () => {
    try {
      if (!user) return
      const alarms = await blink.db.alarms.list({
        where: { 
          AND: [
            { userId: user.id },
            { status: 'active' }
          ]
        }
      })
      setActiveAlarms(alarms.length)
    } catch (error) {
      console.error('Error loading alarms:', error)
    }
  }, [user])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      loadActiveAlarms()
    }
  }, [user, loadActiveAlarms])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje aplikacije...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Seoski Vodovod Monitor</h1>
          <p className="text-gray-600 mb-6">Molimo prijavite se da biste pristupili aplikaciji</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Prijavite se
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'monitoring':
        return (
          <div className="p-6">
            <Monitoring />
          </div>
        )
      case 'alarms':
        return (
          <div className="p-6">
            <Alarms />
          </div>
        )
      case 'reports':
        return (
          <div className="p-6">
            <Reports />
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <Settings />
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeAlarms={activeAlarms} />
      <div className="flex">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default App