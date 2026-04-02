import { useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Activity,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { TelemetryData, Alert } from './types';

const SOCKET_URL = window.location.origin;

export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    temp: 0, hum: 0, aqi: 0,
    gx: 0, gy: 0, gz: 0,
    ax: 0, ay: 0, az: 0,
    rssi: 0,
    timestamp: new Date().toISOString()
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [utcTime, setUtcTime] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket.io initialization
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      addAlert('ok', 'Ground Station Link Established');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      addAlert('err', 'Telemetry Link Lost');
    });

    socketRef.current.on('telemetry', (data: TelemetryData) => {
      setTelemetry(data);
      setPacketCount(prev => prev + 1);
      
      // Auto-alerts based on thresholds
      if (data.temp > 45) addAlert('warn', `Critical Temp: ${data.temp}°C`);
      if (data.aqi > 300) addAlert('err', `Hazardous Air Quality: ${data.aqi}`);
    });

    // UTC Clock
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4]);
    }, 1000);

    return () => {
      socketRef.current?.disconnect();
      clearInterval(timer);
    };
  }, []);

  const addAlert = (type: Alert['type'], msg: string) => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      msg,
      time: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020810] text-[#c8e4f8] font-raj overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#020810]/90 border-b border-[#00E5FF]/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <svg className="w-12 h-12" viewBox="0 0 80 80" fill="none">
            <path d="M52 14 C52 14 62 20 64 32 C66 44 60 54 54 60 L50 72 L46 72 L48 60 C40 58 34 50 34 50 L26 54 C26 54 20 44 22 34 C24 22 34 14 44 14 Z" fill="#D32F2F"/>
            <circle cx="44" cy="36" r="16" fill="#1A237E"/>
            <path d="M44 26 L47 32 L47 40 L44 42 L41 40 L41 32 Z" fill="white" opacity="0.9"/>
            <path d="M44 24 C44 24 47 28 47 32 L41 32 C41 28 44 24 44 24Z" fill="white"/>
            <circle cx="44" cy="36" r="2" fill="#1A237E"/>
          </svg>
          <div>
            <h1 className="font-orb text-base font-bold tracking-[3px] text-white leading-tight">LAB OF FUTURE</h1>
            <span className="font-mono text-[10px] text-[#00E5FF] tracking-[2px]">GROUND STATION v2.1</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="font-orb text-[11px] tracking-[4px] text-[#00E5FF]">⬡ LOF-SAT-01 ⬡</div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#00FF9D]">
            <div className={`w-2 h-2 rounded-full bg-[#00FF9D] shadow-[0_0_8px_#00FF9D] ${isConnected ? 'animate-pulse' : 'opacity-30'}`} />
            {isConnected ? 'UPLINK ACTIVE' : 'LINK OFFLINE'}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="font-mono text-xl text-white tracking-[2px]">{utcTime}</div>
          <div className="font-mono text-[10px] text-[#00E5FF] tracking-[3px]">UTC TIME</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
        
        {/* Thermal & Humidity (DHT11) */}
        <div className="flex flex-col gap-6">
          <Panel title="THERMAL — DHT11">
            <div className="flex items-center justify-between mb-4">
              <Thermometer className="w-8 h-8 text-[#00E5FF]" />
              <div className="text-right">
                <div className="font-orb text-4xl font-black text-white drop-shadow-[0_0_10px_#00E5FF]">
                  {telemetry.temp.toFixed(1)}<span className="text-xl">°C</span>
                </div>
              </div>
            </div>
            <ProgressBar label="TEMPERATURE" value={telemetry.temp} max={50} color="bg-[#00E5FF]" />
          </Panel>

          <Panel title="HUMIDITY — DHT11">
            <div className="flex items-center justify-between mb-4">
              <Droplets className="w-8 h-8 text-[#00FF9D]" />
              <div className="text-right">
                <div className="font-orb text-4xl font-black text-white drop-shadow-[0_0_10px_#00FF9D]">
                  {Math.round(telemetry.hum)}<span className="text-xl">%</span>
                </div>
              </div>
            </div>
            <ProgressBar label="HUMIDITY" value={telemetry.hum} max={100} color="bg-[#00FF9D]" />
          </Panel>
        </div>

        {/* Air Quality & IMU */}
        <div className="flex flex-col gap-6">
          <Panel title="AIR QUALITY — MQ-180">
            <div className="flex items-center justify-between mb-4">
              <Wind className="w-8 h-8 text-[#FFB300]" />
              <div className="text-right">
                <div className="font-orb text-4xl font-black text-white drop-shadow-[0_0_10px_#FFB300]">
                  {Math.round(telemetry.aqi)}
                </div>
                <div className="font-mono text-[10px] text-[#FFB300] tracking-[2px]">PPM / AQI</div>
              </div>
            </div>
            <ProgressBar label="AIR QUALITY" value={telemetry.aqi} max={500} color="bg-[#FFB300]" />
          </Panel>

          <Panel title="IMU TELEMETRY — MPU6050">
            <div className="space-y-4">
              <div>
                <div className="font-mono text-[9px] text-[#00E5FF]/50 tracking-[2px] mb-2 uppercase">Gyroscope (°/s)</div>
                <div className="grid grid-cols-3 gap-2">
                  <IMUCell axis="GX" value={telemetry.gx} />
                  <IMUCell axis="GY" value={telemetry.gy} />
                  <IMUCell axis="GZ" value={telemetry.gz} />
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-[#00E5FF]/50 tracking-[2px] mb-2 uppercase">Accelerometer (g)</div>
                <div className="grid grid-cols-3 gap-2">
                  <IMUCell axis="AX" value={telemetry.ax} />
                  <IMUCell axis="AY" value={telemetry.ay} />
                  <IMUCell axis="AZ" value={telemetry.az} />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Alerts & Stream */}
        <div className="flex flex-col gap-6">
          <Panel title="LIVE PACKET STREAM" className="flex-1 min-h-[200px]">
            <div className="h-full overflow-hidden font-mono text-[11px] space-y-1">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={packetCount}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 border-b border-[#00E5FF]/5 py-1"
                >
                  <span className="text-[#00E5FF]/50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-[#00FF9D]">PKT_{packetCount}</span>
                  <span className="text-white/40">DATA_RX</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </Panel>

          <Panel title="SYSTEM ALERTS">
            <div className="space-y-2">
              {alerts.length === 0 && <div className="text-[11px] opacity-30 font-mono">No active alerts...</div>}
              {alerts.map(alert => (
                <div key={alert.id} className={`flex gap-2 p-2 rounded border ${
                  alert.type === 'ok' ? 'bg-[#00FF9D]/5 border-[#00FF9D]/20' :
                  alert.type === 'warn' ? 'bg-[#FFB300]/5 border-[#FFB300]/20' :
                  'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    alert.type === 'ok' ? 'bg-[#00FF9D]' :
                    alert.type === 'warn' ? 'bg-[#FFB300]' :
                    'bg-red-500'
                  }`} />
                  <div className="font-mono text-[10px]">{alert.msg}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#020810]/95 border-t border-[#00E5FF]/20 px-6 py-3 flex items-center justify-between font-mono text-[10px] text-[#c8e4f8]/40 tracking-wider">
        <div className="flex gap-6">
          <FooterItem color="#00FF9D" label="ESP32 LINK" />
          <FooterItem color="#00E5FF" label="SENSORS OK" />
        </div>
        <div>LAB OF FUTURE — GROUND STATION</div>
      </footer>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string, children: ReactNode, className?: string }) {
  return (
    <div className={`bg-[#06142D]/85 border border-[#00E5FF]/20 rounded-lg p-5 relative backdrop-blur-sm shadow-xl ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent" />
      <div className="font-orb text-[10px] tracking-[3px] text-[#00E5FF] mb-4 flex items-center gap-2">
        {title}
        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#00E5FF]/30 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="py-1">
      <div className="flex justify-between font-mono text-[10px] text-[#c8e4f8]/50 mb-2">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-[#00E5FF]/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${color} shadow-[0_0_8px_rgba(0,229,255,0.5)]`}
        />
      </div>
    </div>
  );
}

function IMUCell({ axis, value }: { axis: string, value: number }) {
  return (
    <div className="bg-[#00E5FF]/5 border border-[#00E5FF]/10 rounded-md py-2 px-1 text-center">
      <div className="font-mono text-[9px] text-[#00E5FF] tracking-[1px]">{axis}</div>
      <div className="font-mono text-[12px] text-white mt-1">{value > 0 ? '+' : ''}{value.toFixed(2)}</div>
    </div>
  );
}

function FooterItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

