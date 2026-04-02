export interface TelemetryData {
  temp: number;
  hum: number;
  aqi: number;
  gx: number;
  gy: number;
  gz: number;
  ax: number;
  ay: number;
  az: number;
  rssi: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'ok' | 'warn' | 'err';
  msg: string;
  time: string;
}
