import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Droplets, ArrowUp, ArrowDown, Wifi, MapPin } from 'lucide-react';

interface ReservoirData {
  level: number;
  inflow: number;
  outflow: number;
  capacity: number;
}

interface WiFiManometer {
  id: string;
  name: string;
  location: string;
  pressure: number;
  status: 'active' | 'warning' | 'error';
  battery: number;
  signal: number;
}

interface ReservoirPanelProps {
  reservoirData: ReservoirData;
  wifiManometers: WiFiManometer[];
}

const ReservoirPanel: React.FC<ReservoirPanelProps> = ({ reservoirData, wifiManometers }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Aktivan</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Upozorenje</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Greška</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Nepoznato</Badge>;
    }
  };

  const getSignalBars = (signal: number) => {
    const bars = Math.ceil(signal / 25);
    return (
      <div className="flex items-end space-x-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 ${bar <= bars ? 'bg-blue-500' : 'bg-gray-300'}`}
            style={{ height: `${bar * 3 + 2}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rezervoar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span>Glavni rezervoar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nivo vode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Nivo vode</span>
                <span className="text-lg font-bold text-blue-600">{reservoirData.level}%</span>
              </div>
              <Progress value={reservoirData.level} className="h-3" />
              <div className="text-xs text-gray-500">
                Kapacitet: {Math.round((reservoirData.level / 100) * reservoirData.capacity).toLocaleString()} / {reservoirData.capacity.toLocaleString()} L
              </div>
            </div>

            {/* Dotok */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-600">Dotok</span>
                </div>
                <span className="text-lg font-bold text-green-600">{reservoirData.inflow} L/min</span>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <div className="text-xs text-green-700">
                  Dnevno: ~{Math.round(reservoirData.inflow * 60 * 24).toLocaleString()} L
                </div>
              </div>
            </div>

            {/* Istok */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ArrowDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">Istok</span>
                </div>
                <span className="text-lg font-bold text-red-600">{reservoirData.outflow} L/min</span>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <div className="text-xs text-red-700">
                  Dnevno: ~{Math.round(reservoirData.outflow * 60 * 24).toLocaleString()} L
                </div>
              </div>
            </div>
          </div>

          {/* Bilans vode */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Bilans vode</span>
              <span className={`text-lg font-bold ${reservoirData.inflow >= reservoirData.outflow ? 'text-green-600' : 'text-red-600'}`}>
                {reservoirData.inflow >= reservoirData.outflow ? '+' : ''}{reservoirData.inflow - reservoirData.outflow} L/min
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {reservoirData.inflow >= reservoirData.outflow 
                ? 'Rezervoar se puni' 
                : 'Rezervoar se prazni'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WiFi manometri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-blue-500" />
            <span>WiFi manometri u šahtovima</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wifiManometers.map((manometer) => (
              <div key={manometer.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(manometer.status)}`} />
                    <span className="font-medium text-sm">{manometer.name}</span>
                  </div>
                  {getStatusBadge(manometer.status)}
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{manometer.location}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pritisak</span>
                    <span className="text-lg font-bold text-blue-600">{manometer.pressure} bar</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Baterija</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={manometer.battery} className="w-16 h-2" />
                      <span className="text-xs text-gray-600">{manometer.battery}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">WiFi signal</span>
                    <div className="flex items-center space-x-2">
                      {getSignalBars(manometer.signal)}
                      <span className="text-xs text-gray-600">{manometer.signal}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservoirPanel;