import { useState, useEffect, useCallback } from 'react'
import { StatusCard } from '@/components/dashboard/StatusCard'
import { RealtimeChart } from '@/components/dashboard/RealtimeChart'
import { AlarmPanel } from '@/components/dashboard/AlarmPanel'
import ReservoirPanel from '@/components/dashboard/ReservoirPanel'
import { Droplets, Gauge, Thermometer, Activity, Zap } from 'lucide-react'
import { blink } from '@/blink/client'
import { Sensor, Alarm, SensorReading } from '@/types'

export function Dashboard() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [reservoirData, setReservoirData] = useState({
    level: 75.5,
    inflow: 45.2,
    outflow: 38.7,
    capacity: 50000
  })
  const [wifiManometers, setWifiManometers] = useState([
    {
      id: 'wifi_manometer_center',
      name: 'Centralni šaht',
      location: 'Centar sela',
      pressure: 2.8,
      status: 'active' as const,
      battery: 78,
      signal: 85
    },
    {
      id: 'wifi_manometer_north',
      name: 'Severni šaht',
      location: 'Severni deo',
      pressure: 2.6,
      status: 'active' as const,
      battery: 85,
      signal: 92
    },
    {
      id: 'wifi_manometer_south',
      name: 'Južni šaht',
      location: 'Južni deo',
      pressure: 2.9,
      status: 'active' as const,
      battery: 91,
      signal: 78
    },
    {
      id: 'wifi_manometer_east',
      name: 'Istočni šaht',
      location: 'Istočni deo',
      pressure: 2.4,
      status: 'warning' as const,
      battery: 67,
      signal: 65
    },
    {
      id: 'wifi_manometer_west',
      name: 'Zapadni šaht',
      location: 'Zapadni deo',
      pressure: 2.7,
      status: 'active' as const,
      battery: 73,
      signal: 88
    }
  ])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      // Load all sensors (including system sensors)
      const sensorsData = await blink.db.sensors.list({
        orderBy: { createdAt: 'desc' }
      })
      setSensors(sensorsData)

      // Load active alarms
      const alarmsData = await blink.db.alarms.list({
        where: { status: 'active' },
        orderBy: { triggeredAt: 'desc' }
      })
      setAlarms(alarmsData)

      // Load recent readings
      const readingsData = await blink.db.sensorReadings.list({
        orderBy: { timestamp: 'desc' },
        limit: 100
      })
      setReadings(readingsData)

      // Load reservoir data from sensors
      const reservoirSensors = sensorsData.filter(s => 
        ['reservoir_level', 'water_inflow', 'water_outflow'].includes(s.type)
      )
      
      if (reservoirSensors.length > 0) {
        const levelSensor = reservoirSensors.find(s => s.type === 'reservoir_level')
        const inflowSensor = reservoirSensors.find(s => s.type === 'water_inflow')
        const outflowSensor = reservoirSensors.find(s => s.type === 'water_outflow')
        
        setReservoirData({
          level: levelSensor?.lastReading || 75.5,
          inflow: inflowSensor?.lastReading || 45.2,
          outflow: outflowSensor?.lastReading || 38.7,
          capacity: 50000
        })
      }

      // Load WiFi manometer data
      const wifiSensors = sensorsData.filter(s => s.type === 'wifi_manometer')
      if (wifiSensors.length > 0) {
        const manometersData = wifiSensors.map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          location: sensor.location,
          pressure: sensor.lastReading || 0,
          status: (sensor.batteryLevel && sensor.batteryLevel < 20) ? 'warning' as const : 'active' as const,
          battery: sensor.batteryLevel || 100,
          signal: Math.floor(Math.random() * 40) + 60 // Mock signal strength
        }))
        setWifiManometers(manometersData)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Simulate real-time updates
    const interval = setInterval(loadData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [loadData])

  const handleAcknowledgeAlarm = async (alarmId: string) => {
    try {
      await blink.db.alarms.update(alarmId, { status: 'acknowledged' })
      loadData()
    } catch (error) {
      console.error('Error acknowledging alarm:', error)
    }
  }

  const handleResolveAlarm = async (alarmId: string) => {
    try {
      await blink.db.alarms.update(alarmId, { 
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      })
      loadData()
    } catch (error) {
      console.error('Error resolving alarm:', error)
    }
  }

  // Generate mock data for demo
  const generateReservoirData = () => {
    const now = new Date()
    const data = []
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      data.push({
        time: time.toISOString(),
        value: reservoirData.level + Math.sin(i * 0.3) * 5 + Math.random() * 3 - 1.5
      })
    }
    return data
  }

  const generateFlowData = (baseValue: number) => {
    const now = new Date()
    const data = []
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      data.push({
        time: time.toISOString(),
        value: baseValue + Math.sin(i * 0.4) * 8 + Math.random() * 6 - 3
      })
    }
    return data
  }

  const reservoirLevelData = generateReservoirData()
  const inflowData = generateFlowData(reservoirData.inflow)
  const outflowData = generateFlowData(reservoirData.outflow)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Učitavanje...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Pregled stanja seoskog vodovoda u realnom vremenu</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatusCard
          title="Nivo rezervoara"
          value={reservoirData.level.toString()}
          unit="%"
          status={reservoirData.level > 20 ? "normal" : "warning"}
          icon={Droplets}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatusCard
          title="Dotok vode"
          value={reservoirData.inflow.toString()}
          unit="L/min"
          status="normal"
          icon={Activity}
          trend={{ value: 1.5, isPositive: true }}
        />
        <StatusCard
          title="Istok vode"
          value={reservoirData.outflow.toString()}
          unit="L/min"
          status="normal"
          icon={Activity}
          trend={{ value: -0.8, isPositive: false }}
        />
        <StatusCard
          title="Pritisak (avg)"
          value={(wifiManometers.reduce((sum, m) => sum + m.pressure, 0) / wifiManometers.length).toFixed(1)}
          unit="bar"
          status="normal"
          icon={Gauge}
        />
        <StatusCard
          title="WiFi senzori"
          value={wifiManometers.filter(m => m.status === 'active').length.toString()}
          unit={`/${wifiManometers.length}`}
          status={wifiManometers.every(m => m.status === 'active') ? "normal" : "warning"}
          icon={Zap}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RealtimeChart
          title="Nivo rezervoara (24h)"
          data={reservoirLevelData}
          color="#2563eb"
          unit="%"
        />
        <RealtimeChart
          title="Dotok vode (24h)"
          data={inflowData}
          color="#10b981"
          unit="L/min"
        />
        <RealtimeChart
          title="Istok vode (24h)"
          data={outflowData}
          color="#ef4444"
          unit="L/min"
        />
      </div>

      {/* Reservoir and WiFi Manometers */}
      <ReservoirPanel
        reservoirData={reservoirData}
        wifiManometers={wifiManometers}
      />

      {/* Alarm Panel */}
      <AlarmPanel
        alarms={alarms}
        onAcknowledge={handleAcknowledgeAlarm}
        onResolve={handleResolveAlarm}
      />
    </div>
  )
}