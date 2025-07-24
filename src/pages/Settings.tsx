import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings as SettingsIcon, Bell, Database, Wifi, Shield, User, Plus, Edit, Trash2, Save } from 'lucide-react';
import { blink } from '@/blink/client';
import type { SystemSetting, Sensor, SensorLocation } from '@/types';

export default function Settings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [locations, setLocations] = useState<SensorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false);
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SensorLocation | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: ''
  });

  const loadData = async () => {
    try {
      const user = await blink.auth.me();
      
      const [settingsData, sensorsData, locationsData] = await Promise.all([
        blink.db.systemSettings.list({ where: { userId: user.id } }),
        blink.db.sensors.list({ where: { userId: user.id } }),
        blink.db.sensorLocations.list()
      ]);

      setSettings(settingsData);
      setSensors(sensorsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSetting = (key: string, defaultValue: string = '') => {
    const setting = settings.find(s => s.settingKey === key);
    return setting?.settingValue || defaultValue;
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const user = await blink.auth.me();
      const existingSetting = settings.find(s => s.settingKey === key);
      
      if (existingSetting) {
        await blink.db.systemSettings.update(existingSetting.id, {
          settingValue: value,
          updatedAt: new Date().toISOString()
        });
      } else {
        await blink.db.systemSettings.create({
          id: `setting_${Date.now()}`,
          userId: user.id,
          settingKey: key,
          settingValue: value,
          updatedAt: new Date().toISOString()
        });
      }
      
      loadData();
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const createLocation = async () => {
    try {
      await blink.db.sensorLocations.create({
        id: `location_${Date.now()}`,
        name: newLocation.name,
        description: newLocation.description,
        latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : null,
        longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : null,
        createdAt: new Date().toISOString()
      });

      setShowNewLocationDialog(false);
      setNewLocation({ name: '', description: '', latitude: '', longitude: '' });
      loadData();
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const updateLocation = async () => {
    if (!selectedLocation) return;
    
    try {
      await blink.db.sensorLocations.update(selectedLocation.id, {
        name: newLocation.name,
        description: newLocation.description,
        latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : null,
        longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : null
      });

      setShowEditLocationDialog(false);
      setSelectedLocation(null);
      setNewLocation({ name: '', description: '', latitude: '', longitude: '' });
      loadData();
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const deleteLocation = async (locationId: string) => {
    try {
      await blink.db.sensorLocations.delete(locationId);
      loadData();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const openEditDialog = (location: SensorLocation) => {
    setSelectedLocation(location);
    setNewLocation({
      name: location.name,
      description: location.description || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || ''
    });
    setShowEditLocationDialog(true);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Podešavanja sistema</h1>
          <p className="text-gray-600">Konfigurišite parametre aplikacije i upravljajte sistemom</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Opšte</TabsTrigger>
          <TabsTrigger value="notifications">Obaveštenja</TabsTrigger>
          <TabsTrigger value="sensors">Senzori</TabsTrigger>
          <TabsTrigger value="locations">Lokacije</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Osnovna podešavanja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="refreshRate">Interval osvežavanja podataka (sekunde)</Label>
                  <Select 
                    value={getSetting('data_refresh_rate', '30')} 
                    onValueChange={(value) => updateSetting('data_refresh_rate', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 sekundi</SelectItem>
                      <SelectItem value="30">30 sekundi</SelectItem>
                      <SelectItem value="60">1 minut</SelectItem>
                      <SelectItem value="300">5 minuta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select 
                    value={getSetting('theme_mode', 'light')} 
                    onValueChange={(value) => updateSetting('theme_mode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Svetla</SelectItem>
                      <SelectItem value="dark">Tamna</SelectItem>
                      <SelectItem value="auto">Automatska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Jezik</Label>
                  <Select 
                    value={getSetting('language', 'sr')} 
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sr">Srpski</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Vremenska zona</Label>
                  <Select 
                    value={getSetting('timezone', 'Europe/Belgrade')} 
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Belgrade">Beograd (CET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Napredna podešavanja</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatsko čuvanje podataka</Label>
                    <p className="text-sm text-gray-600">Automatski sačuvaj podatke svakih 5 minuta</p>
                  </div>
                  <Switch
                    checked={getSetting('auto_save_enabled', '1') === '1'}
                    onCheckedChange={(checked) => updateSetting('auto_save_enabled', checked ? '1' : '0')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug mode</Label>
                    <p className="text-sm text-gray-600">Prikaži dodatne informacije za dijagnostiku</p>
                  </div>
                  <Switch
                    checked={getSetting('debug_mode', '0') === '1'}
                    onCheckedChange={(checked) => updateSetting('debug_mode', checked ? '1' : '0')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Podešavanja obaveštenja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email obaveštenja</Label>
                    <p className="text-sm text-gray-600">Primaj obaveštenja putem email-a</p>
                  </div>
                  <Switch
                    checked={getSetting('alert_email_enabled', '1') === '1'}
                    onCheckedChange={(checked) => updateSetting('alert_email_enabled', checked ? '1' : '0')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Zvučna obaveštenja</Label>
                    <p className="text-sm text-gray-600">Reprodukuj zvuk kada se aktivira alarm</p>
                  </div>
                  <Switch
                    checked={getSetting('alert_sound_enabled', '1') === '1'}
                    onCheckedChange={(checked) => updateSetting('alert_sound_enabled', checked ? '1' : '0')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push obaveštenja</Label>
                    <p className="text-sm text-gray-600">Prikaži obaveštenja u browseru</p>
                  </div>
                  <Switch
                    checked={getSetting('push_notifications_enabled', '0') === '1'}
                    onCheckedChange={(checked) => updateSetting('push_notifications_enabled', checked ? '1' : '0')}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email konfiguracija</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailFrom">Email pošaljilac</Label>
                    <Input
                      id="emailFrom"
                      type="email"
                      value={getSetting('email_from', '')}
                      onChange={(e) => updateSetting('email_from', e.target.value)}
                      placeholder="noreply@vodovod.rs"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailTo">Email primalac</Label>
                    <Input
                      id="emailTo"
                      type="email"
                      value={getSetting('email_to', '')}
                      onChange={(e) => updateSetting('email_to', e.target.value)}
                      placeholder="admin@vodovod.rs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Upravljanje senzorima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Wifi className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Aktivni senzori</p>
                          <p className="text-xl font-bold text-green-600">
                            {sensors.filter(s => {
                              // Simulate active status based on recent activity
                              return Math.random() > 0.2; // 80% active
                            }).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Offline senzori</p>
                          <p className="text-xl font-bold text-red-600">
                            {sensors.filter(s => {
                              // Simulate offline status
                              return Math.random() < 0.2; // 20% offline
                            }).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Ukupno senzora</p>
                          <p className="text-xl font-bold text-blue-600">{sensors.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Naziv</th>
                        <th className="text-left py-3 px-4">Tip</th>
                        <th className="text-left py-3 px-4">Lokacija</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Poslednje ažuriranje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensors.map(sensor => {
                        const location = locations.find(l => l.id === sensor.locationId);
                        const isActive = Math.random() > 0.2; // Simulate status
                        
                        return (
                          <tr key={sensor.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{sensor.name}</td>
                            <td className="py-3 px-4">{sensor.type}</td>
                            <td className="py-3 px-4">{location?.name || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <Badge variant={isActive ? 'default' : 'destructive'}>
                                {isActive ? 'Aktivan' : 'Offline'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date().toLocaleString('sr-RS')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Upravljanje lokacijama
                </CardTitle>
                
                <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova lokacija
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Kreiranje nove lokacije</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="locationName">Naziv lokacije</Label>
                        <Input
                          id="locationName"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                          placeholder="Unesite naziv lokacije"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="locationDescription">Opis</Label>
                        <Input
                          id="locationDescription"
                          value={newLocation.description}
                          onChange={(e) => setNewLocation({...newLocation, description: e.target.value})}
                          placeholder="Unesite opis lokacije"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="latitude">Geografska širina</Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="0.000001"
                            value={newLocation.latitude}
                            onChange={(e) => setNewLocation({...newLocation, latitude: e.target.value})}
                            placeholder="44.787197"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="longitude">Geografska dužina</Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="0.000001"
                            value={newLocation.longitude}
                            onChange={(e) => setNewLocation({...newLocation, longitude: e.target.value})}
                            placeholder="20.457273"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={createLocation} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          Sačuvaj
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewLocationDialog(false)}>
                          Otkaži
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locations.map(location => (
                  <Card key={location.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{location.name}</h3>
                          {location.description && (
                            <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                          )}
                          {location.latitude && location.longitude && (
                            <p className="text-xs text-gray-500 mt-1">
                              Koordinate: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Senzori na ovoj lokaciji: {sensors.filter(s => s.locationId === location.id).length}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteLocation(location.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Izmena lokacije</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editLocationName">Naziv lokacije</Label>
                  <Input
                    id="editLocationName"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                    placeholder="Unesite naziv lokacije"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editLocationDescription">Opis</Label>
                  <Input
                    id="editLocationDescription"
                    value={newLocation.description}
                    onChange={(e) => setNewLocation({...newLocation, description: e.target.value})}
                    placeholder="Unesite opis lokacije"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editLatitude">Geografska širina</Label>
                    <Input
                      id="editLatitude"
                      type="number"
                      step="0.000001"
                      value={newLocation.latitude}
                      onChange={(e) => setNewLocation({...newLocation, latitude: e.target.value})}
                      placeholder="44.787197"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editLongitude">Geografska dužina</Label>
                    <Input
                      id="editLongitude"
                      type="number"
                      step="0.000001"
                      value={newLocation.longitude}
                      onChange={(e) => setNewLocation({...newLocation, longitude: e.target.value})}
                      placeholder="20.457273"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={updateLocation} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Sačuvaj izmene
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditLocationDialog(false)}>
                    Otkaži
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}