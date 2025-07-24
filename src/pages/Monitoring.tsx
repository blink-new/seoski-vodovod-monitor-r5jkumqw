import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Battery, MapPin, Settings, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { blink } from '@/blink/client';
import type { Sensor, SensorReading, SensorType, SensorLocation } from '@/types';

export default function Monitoring() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorTypes, setSensorTypes] = useState<SensorType[]>([]);
  const [locations, setLocations] = useState<SensorLocation[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const user = await blink.auth.me();
      
      const [sensorsData, typesData, locationsData, readingsData] = await Promise.all([
        blink.db.sensors.list({ where: { userId: user.id } }),
        blink.db.sensorTypes.list(),
        blink.db.sensorLocations.list(),
        blink.db.sensorReadings.list({ 
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          limit: 1000
        })
      ]);

      setSensors(sensorsData);
      setSensorTypes(typesData);
      setLocations(locationsData);
      setReadings(readingsData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSensorStatus = (sensor: Sensor, latestReading?: SensorReading) => {
    if (!latestReading) return 'offline';
    
    const sensorType = sensorTypes.find(t => t.id === sensor.type);
    if (!sensorType) return 'unknown';

    const value = latestReading.value;
    if (value < sensorType.criticalMin || value > sensorType.criticalMax) {
      return 'critical';
    }
    if (value < sensorType.minValue || value > sensorType.maxValue) {
      return 'warning';
    }
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'offline': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const filteredReadings = selectedSensor === 'all' 
    ? readings 
    : readings.filter(r => r.sensorId === selectedSensor);

  const chartData = filteredReadings
    .slice(0, 50)
    .reverse()
    .map(reading => ({
      time: new Date(reading.timestamp).toLocaleTimeString('sr-RS', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: reading.value,
      sensorName: sensors.find(s => s.id === reading.sensorId)?.name || 'Nepoznat'
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoring senzora</h1>
          <p className="text-gray-600">Detaljni pregled svih senzora i njihovih očitavanja</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedSensor} onValueChange={setSelectedSensor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Izaberite senzor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi senzori</SelectItem>
              {sensors.map(sensor => (
                <SelectItem key={sensor.id} value={sensor.id}>
                  {sensor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7 dana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Pregled</TabsTrigger>
          <TabsTrigger value="sensors">Senzori</TabsTrigger>
          <TabsTrigger value="charts">Grafici</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sensors.map(sensor => {
              const latestReading = readings
                .filter(r => r.sensorId === sensor.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              
              const status = getSensorStatus(sensor, latestReading);
              const sensorType = sensorTypes.find(t => t.id === sensor.type);
              const location = locations.find(l => l.id === sensor.locationId);

              return (
                <Card key={sensor.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{sensor.name}</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {latestReading ? latestReading.value.toFixed(1) : '--'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {sensorType?.unit || ''}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {location?.name || 'Nepoznata lokacija'}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Battery className="h-3 w-3" />
                        <Progress value={sensor.batteryLevel || 100} className="flex-1 h-1" />
                        <span>{sensor.batteryLevel || 100}%</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant={status === 'normal' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
                          {getStatusIcon(status)}
                          <span className="ml-1">
                            {status === 'normal' ? 'Normalno' : 
                             status === 'warning' ? 'Upozorenje' : 
                             status === 'critical' ? 'Kritično' : 'Offline'}
                          </span>
                        </Badge>
                        
                        <span className="text-gray-500">
                          {latestReading ? 
                            new Date(latestReading.timestamp).toLocaleTimeString('sr-RS', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '--:--'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sensors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista senzora</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Naziv</th>
                      <th className="text-left py-3 px-4">Tip</th>
                      <th className="text-left py-3 px-4">Lokacija</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Poslednja vrednost</th>
                      <th className="text-left py-3 px-4">Baterija</th>
                      <th className="text-left py-3 px-4">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map(sensor => {
                      const latestReading = readings
                        .filter(r => r.sensorId === sensor.id)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                      
                      const status = getSensorStatus(sensor, latestReading);
                      const sensorType = sensorTypes.find(t => t.id === sensor.type);
                      const location = locations.find(l => l.id === sensor.locationId);

                      return (
                        <tr key={sensor.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{sensor.name}</td>
                          <td className="py-3 px-4">{sensorType?.name || sensor.type}</td>
                          <td className="py-3 px-4">{location?.name || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={status === 'normal' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
                              {getStatusIcon(status)}
                              <span className="ml-1">
                                {status === 'normal' ? 'Normalno' : 
                                 status === 'warning' ? 'Upozorenje' : 
                                 status === 'critical' ? 'Kritično' : 'Offline'}
                              </span>
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {latestReading ? 
                              `${latestReading.value.toFixed(1)} ${sensorType?.unit || ''}` : 
                              'N/A'
                            }
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Progress value={sensor.batteryLevel || 100} className="w-16 h-2" />
                              <span className="text-sm">{sensor.batteryLevel || 100}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grafici očitavanja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Vreme: ${label}`}
                      formatter={(value: number) => [value.toFixed(2), 'Vrednost']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563EB" 
                      fill="#2563EB" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}