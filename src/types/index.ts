export interface Sensor {
  id: string
  name: string
  type: 'pressure' | 'flow' | 'quality' | 'level' | 'temperature'
  location: string
  locationId?: string
  status: 'active' | 'inactive' | 'error'
  lastReading: number
  unit: string
  minThreshold: number
  maxThreshold: number
  batteryLevel?: number
  calibrationDate?: string
  maintenanceDate?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface SensorReading {
  id: string
  sensorId: string
  value: number
  timestamp: string
  userId: string
}

export interface Alarm {
  id: string
  sensorId: string
  type: 'threshold' | 'offline' | 'error'
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  timestamp: string
  acknowledged: string
  acknowledgedAt?: string
  userId: string
}

export interface SystemStatus {
  id: string
  component: string
  status: 'online' | 'offline' | 'maintenance'
  lastCheck: string
  userId: string
}

export interface SensorType {
  id: string;
  name: string;
  unit: string;
  minValue: number;
  maxValue: number;
  criticalMin: number;
  criticalMax: number;
  createdAt: string;
}

export interface SensorLocation {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface AlarmRule {
  id: string;
  userId: string;
  sensorType: string;
  conditionType: string;
  thresholdValue: number;
  severity: string;
  enabled: string;
  notificationEmail: string;
  notificationSms: string;
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  data: string;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  userId: string;
  settingKey: string;
  settingValue: string;
  updatedAt: string;
}