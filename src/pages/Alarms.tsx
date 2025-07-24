import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Bell, BellOff, Plus, Settings, Trash2, CheckCircle, Clock } from 'lucide-react';
import { blink } from '@/blink/client';
import type { Alarm, AlarmRule, SensorType } from '@/types';

export default function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>([]);
  const [sensorTypes, setSensorTypes] = useState<SensorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    sensorType: '',
    conditionType: 'above',
    thresholdValue: 0,
    severity: 'medium',
    enabled: true,
    notificationEmail: true,
    notificationSms: false
  });

  const loadData = async () => {
    try {
      const user = await blink.auth.me();
      
      const [alarmsData, rulesData, typesData] = await Promise.all([
        blink.db.alarms.list({ 
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          limit: 100
        }),
        blink.db.alarmRules.list({ where: { userId: user.id } }),
        blink.db.sensorTypes.list()
      ]);

      setAlarms(alarmsData);
      setAlarmRules(rulesData);
      setSensorTypes(typesData);
    } catch (error) {
      console.error('Error loading alarms data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const acknowledgeAlarm = async (alarmId: string) => {
    try {
      await blink.db.alarms.update(alarmId, { 
        acknowledged: "1",
        acknowledgedAt: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
    }
  };

  const createAlarmRule = async () => {
    try {
      const user = await blink.auth.me();
      
      await blink.db.alarmRules.create({
        id: `rule_${Date.now()}`,
        userId: user.id,
        sensorType: newRule.sensorType,
        conditionType: newRule.conditionType,
        thresholdValue: newRule.thresholdValue,
        severity: newRule.severity,
        enabled: newRule.enabled ? "1" : "0",
        notificationEmail: newRule.notificationEmail ? "1" : "0",
        notificationSms: newRule.notificationSms ? "1" : "0",
        createdAt: new Date().toISOString()
      });

      setShowNewRuleDialog(false);
      setNewRule({
        sensorType: '',
        conditionType: 'above',
        thresholdValue: 0,
        severity: 'medium',
        enabled: true,
        notificationEmail: true,
        notificationSms: false
      });
      loadData();
    } catch (error) {
      console.error('Error creating alarm rule:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await blink.db.alarmRules.update(ruleId, { enabled: enabled ? "1" : "0" });
      loadData();
    } catch (error) {
      console.error('Error toggling alarm rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      await blink.db.alarmRules.delete(ruleId);
      loadData();
    } catch (error) {
      console.error('Error deleting alarm rule:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low': return 'secondary';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const activeAlarms = alarms.filter(alarm => Number(alarm.acknowledged) === 0);
  const acknowledgedAlarms = alarms.filter(alarm => Number(alarm.acknowledged) > 0);

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
          <h1 className="text-3xl font-bold text-gray-900">Upravljanje alarmima</h1>
          <p className="text-gray-600">Konfigurišite pravila alarma i pratite obaveštenja</p>
        </div>
        
        <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo pravilo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Kreiranje novog pravila alarma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sensorType">Tip senzora</Label>
                <Select value={newRule.sensorType} onValueChange={(value) => setNewRule({...newRule, sensorType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite tip senzora" />
                  </SelectTrigger>
                  <SelectContent>
                    {sensorTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="condition">Uslov</Label>
                <Select value={newRule.conditionType} onValueChange={(value) => setNewRule({...newRule, conditionType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Iznad</SelectItem>
                    <SelectItem value="below">Ispod</SelectItem>
                    <SelectItem value="equals">Jednako</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="threshold">Granična vrednost</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newRule.thresholdValue}
                  onChange={(e) => setNewRule({...newRule, thresholdValue: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="severity">Ozbiljnost</Label>
                <Select value={newRule.severity} onValueChange={(value) => setNewRule({...newRule, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niska</SelectItem>
                    <SelectItem value="medium">Srednja</SelectItem>
                    <SelectItem value="high">Visoka</SelectItem>
                    <SelectItem value="critical">Kritična</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email obaveštenja</Label>
                  <Switch
                    checked={newRule.notificationEmail}
                    onCheckedChange={(checked) => setNewRule({...newRule, notificationEmail: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms">SMS obaveštenja</Label>
                  <Switch
                    checked={newRule.notificationSms}
                    onCheckedChange={(checked) => setNewRule({...newRule, notificationSms: checked})}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={createAlarmRule} className="flex-1">
                  Kreiraj pravilo
                </Button>
                <Button variant="outline" onClick={() => setShowNewRuleDialog(false)}>
                  Otkaži
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktivni alarmi</p>
                <p className="text-2xl font-bold text-red-600">{activeAlarms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Potvrđeni alarmi</p>
                <p className="text-2xl font-bold text-green-600">{acknowledgedAlarms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktivna pravila</p>
                <p className="text-2xl font-bold text-blue-600">
                  {alarmRules.filter(rule => Number(rule.enabled) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Aktivni alarmi</TabsTrigger>
          <TabsTrigger value="history">Istorija</TabsTrigger>
          <TabsTrigger value="rules">Pravila</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlarms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nema aktivnih alarma</h3>
                <p className="text-gray-600">Svi sistemi rade normalno</p>
              </CardContent>
            </Card>
          ) : (
            activeAlarms.map(alarm => (
              <Card key={alarm.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityBadge(alarm.severity)}>
                          {alarm.severity === 'low' ? 'Niska' :
                           alarm.severity === 'medium' ? 'Srednja' :
                           alarm.severity === 'high' ? 'Visoka' : 'Kritična'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alarm.timestamp).toLocaleString('sr-RS')}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{alarm.message}</h3>
                      <p className="text-sm text-gray-600">Senzor: {alarm.sensorId}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => acknowledgeAlarm(alarm.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Potvrdi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {acknowledgedAlarms.map(alarm => (
            <Card key={alarm.id} className="opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {alarm.severity === 'low' ? 'Niska' :
                         alarm.severity === 'medium' ? 'Srednja' :
                         alarm.severity === 'high' ? 'Visoka' : 'Kritična'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(alarm.timestamp).toLocaleString('sr-RS')}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{alarm.message}</h3>
                    <p className="text-sm text-gray-600">Senzor: {alarm.sensorId}</p>
                    {alarm.acknowledgedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Potvrđeno: {new Date(alarm.acknowledgedAt).toLocaleString('sr-RS')}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {alarmRules.map(rule => {
            const sensorType = sensorTypes.find(t => t.id === rule.sensorType);
            return (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {sensorType?.name || rule.sensorType}
                        </h3>
                        <Badge variant={getSeverityBadge(rule.severity)}>
                          {rule.severity === 'low' ? 'Niska' :
                           rule.severity === 'medium' ? 'Srednja' :
                           rule.severity === 'high' ? 'Visoka' : 'Kritična'}
                        </Badge>
                        {Number(rule.enabled) > 0 ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Alarm kada je vrednost {rule.conditionType === 'above' ? 'iznad' : 
                                                rule.conditionType === 'below' ? 'ispod' : 'jednaka'} {rule.thresholdValue} {sensorType?.unit}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {Number(rule.notificationEmail) > 0 && <span>📧 Email</span>}
                        {Number(rule.notificationSms) > 0 && <span>📱 SMS</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Number(rule.enabled) > 0}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}