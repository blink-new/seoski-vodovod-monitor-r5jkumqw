import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar as CalendarIcon, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import { blink } from '@/blink/client';
import type { SensorReading, Sensor, Alarm, Report } from '@/types';

export default function Reports() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('daily');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  const loadData = async () => {
    try {
      const user = await blink.auth.me();
      
      const [sensorsData, readingsData, alarmsData, reportsData] = await Promise.all([
        blink.db.sensors.list({ where: { userId: user.id } }),
        blink.db.sensorReadings.list({ 
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          limit: 1000
        }),
        blink.db.alarms.list({ 
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          limit: 100
        }),
        blink.db.reports.list({ 
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      setSensors(sensorsData);
      setReadings(readingsData);
      setAlarms(alarmsData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateAverageValues = (data: SensorReading[]) => {
    const sensorGroups = data.reduce((acc, reading) => {
      if (!acc[reading.sensorId]) {
        acc[reading.sensorId] = [];
      }
      acc[reading.sensorId].push(reading.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(sensorGroups).map(([sensorId, values]) => {
      const sensor = sensors.find(s => s.id === sensorId);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      return {
        sensorId,
        sensorName: sensor?.name || 'Nepoznat',
        average: average.toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        count: values.length
      };
    });
  };

  const calculateTrends = (data: SensorReading[]) => {
    // Group by day and calculate daily averages
    const dailyData = data.reduce((acc, reading) => {
      const date = format(new Date(reading.timestamp), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(reading.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(dailyData)
      .map(([date, values]) => ({
        date,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateSensorStatus = (data: SensorReading[]) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return sensors.map(sensor => {
      const recentReadings = data.filter(r => 
        r.sensorId === sensor.id && 
        new Date(r.timestamp) > oneHourAgo
      );
      
      return {
        sensorId: sensor.id,
        sensorName: sensor.name,
        status: recentReadings.length > 0 ? 'online' : 'offline',
        lastReading: recentReadings.length > 0 ? 
          Math.max(...recentReadings.map(r => new Date(r.timestamp).getTime())) : null
      };
    });
  };

  const generateReport = async () => {
    try {
      const user = await blink.auth.me();
      
      // Filter data based on selected criteria
      const filteredReadings = readings.filter(reading => {
        const readingDate = new Date(reading.timestamp);
        const isInDateRange = readingDate >= dateFrom && readingDate <= dateTo;
        const isSensorMatch = selectedSensor === 'all' || reading.sensorId === selectedSensor;
        return isInDateRange && isSensorMatch;
      });

      const filteredAlarms = alarms.filter(alarm => {
        const alarmDate = new Date(alarm.timestamp);
        return alarmDate >= dateFrom && alarmDate <= dateTo;
      });

      // Generate report data
      const reportData = {
        period: `${format(dateFrom, 'dd.MM.yyyy', { locale: sr })} - ${format(dateTo, 'dd.MM.yyyy', { locale: sr })}`,
        totalReadings: filteredReadings.length,
        totalAlarms: filteredAlarms.length,
        criticalAlarms: filteredAlarms.filter(a => a.severity === 'critical').length,
        averageValues: calculateAverageValues(filteredReadings),
        trends: calculateTrends(filteredReadings),
        sensorStatus: calculateSensorStatus(filteredReadings)
      };

      // Save report to database
      const reportId = `report_${Date.now()}`;
      await blink.db.reports.create({
        id: reportId,
        userId: user.id,
        title: `${reportType === 'daily' ? 'Dnevni' : reportType === 'weekly' ? 'Nedeljni' : 'Mesečni'} izveštaj`,
        type: reportType,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        data: JSON.stringify(reportData),
        createdAt: new Date().toISOString()
      });

      loadData();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const chartData = readings
    .filter(reading => {
      const readingDate = new Date(reading.timestamp);
      const isInDateRange = readingDate >= dateFrom && readingDate <= dateTo;
      const isSensorMatch = selectedSensor === 'all' || reading.sensorId === selectedSensor;
      return isInDateRange && isSensorMatch;
    })
    .slice(0, 50)
    .reverse()
    .map(reading => ({
      time: format(new Date(reading.timestamp), 'dd.MM HH:mm'),
      value: reading.value,
      sensorName: sensors.find(s => s.id === reading.sensorId)?.name || 'Nepoznat'
    }));

  const alarmsByDay = alarms
    .filter(alarm => {
      const alarmDate = new Date(alarm.timestamp);
      return alarmDate >= dateFrom && alarmDate <= dateTo;
    })
    .reduce((acc, alarm) => {
      const date = format(new Date(alarm.timestamp), 'dd.MM');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const alarmChartData = Object.entries(alarmsByDay).map(([date, count]) => ({
    date,
    count
  }));

  const severityData = alarms
    .filter(alarm => {
      const alarmDate = new Date(alarm.timestamp);
      return alarmDate >= dateFrom && alarmDate <= dateTo;
    })
    .reduce((acc, alarm) => {
      acc[alarm.severity] = (acc[alarm.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const severityChartData = Object.entries(severityData).map(([severity, count]) => ({
    name: severity === 'low' ? 'Niska' : 
          severity === 'medium' ? 'Srednja' : 
          severity === 'high' ? 'Visoka' : 'Kritična',
    value: count,
    color: severity === 'low' ? '#3B82F6' : 
           severity === 'medium' ? '#EAB308' : 
           severity === 'high' ? '#F97316' : '#EF4444'
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
          <h1 className="text-3xl font-bold text-gray-900">Izveštaji i analitika</h1>
          <p className="text-gray-600">Generirajte detaljne izveštaje o radu sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parametri izveštaja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Tip izveštaja</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Dnevni</SelectItem>
                  <SelectItem value="weekly">Nedeljni</SelectItem>
                  <SelectItem value="monthly">Mesečni</SelectItem>
                  <SelectItem value="custom">Prilagođeni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Senzor</Label>
              <Select value={selectedSensor} onValueChange={setSelectedSensor}>
                <SelectTrigger>
                  <SelectValue />
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
            </div>
            
            <div>
              <Label>Od datuma</Label>
              <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, 'dd.MM.yyyy', { locale: sr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      if (date) setDateFrom(date);
                      setShowFromCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Do datuma</Label>
              <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, 'dd.MM.yyyy', { locale: sr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      if (date) setDateTo(date);
                      setShowToCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Button onClick={generateReport} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            Generiši izveštaj
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
          <TabsTrigger value="charts">Grafici</TabsTrigger>
          <TabsTrigger value="history">Istorija izveštaja</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ukupno očitavanja</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {readings.filter(r => {
                        const date = new Date(r.timestamp);
                        return date >= dateFrom && date <= dateTo;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ukupno alarma</p>
                    <p className="text-2xl font-bold text-red-600">
                      {alarms.filter(a => {
                        const date = new Date(a.timestamp);
                        return date >= dateFrom && date <= dateTo;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Aktivni senzori</p>
                    <p className="text-2xl font-bold text-green-600">
                      {sensors.filter(s => {
                        const recentReadings = readings.filter(r => 
                          r.sensorId === s.id && 
                          new Date(r.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
                        );
                        return recentReadings.length > 0;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kritični alarmi</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {alarms.filter(a => {
                        const date = new Date(a.timestamp);
                        return date >= dateFrom && date <= dateTo && a.severity === 'critical';
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Očitavanja senzora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Alarmi po danima</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alarmChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Alarmi po ozbiljnosti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nema generisanih izveštaja</h3>
                <p className="text-gray-600">Generirajte prvi izveštaj koristeći parametre iznad</p>
              </CardContent>
            </Card>
          ) : (
            reports.map(report => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                        <Badge variant="outline">
                          {report.type === 'daily' ? 'Dnevni' :
                           report.type === 'weekly' ? 'Nedeljni' :
                           report.type === 'monthly' ? 'Mesečni' : 'Prilagođeni'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Period: {format(new Date(report.dateFrom), 'dd.MM.yyyy', { locale: sr })} - {format(new Date(report.dateTo), 'dd.MM.yyyy', { locale: sr })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Kreiran: {format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Preuzmi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}