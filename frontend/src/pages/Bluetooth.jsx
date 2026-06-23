import React, { useState, useEffect } from 'react';
import { PageHeader, GlassCard, LiveBadge, SeverityBadge } from '../components/shared/index.jsx';
import { Bluetooth as BluetoothIcon, BluetoothConnected, Search, RefreshCw, Settings, Video, Battery, Signal, Trash2, Play, Square } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/bluetooth';

export default function Bluetooth() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [streaming, setStreaming] = useState(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/devices`);
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices([]); // Set empty array on error to prevent crashes
    }
  };

  const scanDevices = async () => {
    setScanning(true);
    try {
      await axios.post(`${API_BASE}/scan`);
      await loadDevices();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const connectDevice = async (deviceId) => {
    try {
      await axios.post(`${API_BASE}/connect`, { device_id: deviceId });
      await loadDevices();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const disconnectDevice = async (deviceId) => {
    try {
      await axios.post(`${API_BASE}/disconnect`, null, { params: { device_id: deviceId } });
      await loadDevices();
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  };

  const unpairDevice = async (deviceId) => {
    try {
      await axios.post(`${API_BASE}/unpair`, null, { params: { device_id: deviceId } });
      await loadDevices();
    } catch (error) {
      console.error('Unpair failed:', error);
    }
  };

  const startStreaming = async (deviceId) => {
    try {
      const response = await axios.post(`${API_BASE}/streaming/start`, {
        device_id: deviceId,
        resolution: '1080p',
        fps: 30,
        bitrate: 4000,
      });
      setStreaming(response.data.stream);
    } catch (error) {
      console.error('Streaming failed:', error);
    }
  };

  const stopStreaming = async (deviceId) => {
    try {
      await axios.post(`${API_BASE}/streaming/stop`, null, { params: { device_id: deviceId } });
      setStreaming(null);
    } catch (error) {
      console.error('Stop streaming failed:', error);
    }
  };

  const connectedCount = devices.filter(d => d.status === 'connected').length;

  return (
    <div className="page-enter">
      <PageHeader
        title="Bluetooth Camera Manager"
        subtitle="Wireless camera connection and streaming control"
        badge={<LiveBadge label={connectedCount > 0 ? `${connectedCount} CONNECTED` : 'NO DEVICES'} />}
        actions={
          <button 
            className="btn-primary" 
            onClick={scanDevices}
            disabled={scanning}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Search size={16} />
            {scanning ? 'Scanning...' : 'Scan Devices'}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Device List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {devices.length === 0 ? (
            <GlassCard style={{ padding: 60, textAlign: 'center' }}>
              <BluetoothIcon size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>No Devices Found</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                Click "Scan Devices" to discover nearby Bluetooth cameras
              </div>
            </GlassCard>
          ) : (
            devices.map((device) => (
              <GlassCard 
                key={device.device_id}
                style={{ 
                  padding: 20, 
                  border: device.status === 'connected' ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: device.status === 'connected' ? '#ecfdf5' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 12, 
                      background: device.status === 'connected' ? '#059669' : '#e2e8f0',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {device.status === 'connected' ? (
                        <BluetoothConnected size={24} color="#ffffff" />
                      ) : (
                        <BluetoothIcon size={24} color="#64748b" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                        {device.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                        {device.mac_address}
                      </div>
                    </div>
                  </div>
                  <SeverityBadge 
                    severity={device.status === 'connected' ? 'low' : device.status === 'connecting' ? 'medium' : 'high'} 
                    label={device.status.toUpperCase()}
                  />
                </div>

                {/* Device Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Signal size={16} color={device.signal_strength > 70 ? '#059669' : device.signal_strength > 40 ? '#d97706' : '#dc2626'} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{device.signal_strength}%</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Signal</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Battery size={16} color={device.battery_level > 50 ? '#059669' : device.battery_level > 20 ? '#d97706' : '#dc2626'} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{Math.round(device.battery_level)}%</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Battery</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Video size={16} color="#4f46e5" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{device.device_type}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Type</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {device.status === 'connected' ? (
                    <>
                      {streaming?.device_id === device.device_id ? (
                        <button 
                          className="btn-ghost" 
                          onClick={() => stopStreaming(device.device_id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderColor: '#dc2626', color: '#dc2626' }}
                        >
                          <Square size={14} /> Stop Stream
                        </button>
                      ) : (
                        <button 
                          className="btn-primary" 
                          onClick={() => startStreaming(device.device_id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          <Play size={14} /> Start Stream
                        </button>
                      )}
                      <button 
                        className="btn-ghost" 
                        onClick={() => disconnectDevice(device.device_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <RefreshCw size={14} /> Disconnect
                      </button>
                      <button 
                        className="btn-ghost" 
                        onClick={() => unpairDevice(device.device_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}
                      >
                        <Trash2 size={14} /> Unpair
                      </button>
                    </>
                  ) : device.status === 'connecting' ? (
                    <button className="btn-ghost" disabled style={{ flex: 1 }}>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Connecting...
                    </button>
                  ) : (
                    <button 
                      className="btn-primary" 
                      onClick={() => connectDevice(device.device_id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <BluetoothConnected size={14} /> Connect
                    </button>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Device Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {streaming ? (
            <GlassCard style={{ padding: 20, border: '2px solid #059669', background: '#ecfdf5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Video size={20} color="#059669" />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>Live Streaming</div>
              </div>
              <div style={{ background: '#000', borderRadius: 8, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>
                  <Video size={32} style={{ marginBottom: 8 }} />
                  <div>Stream Active</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{streaming.resolution} @ {streaming.fps}fps</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <div>Stream ID: {streaming.stream_id}</div>
                <div>Bitrate: {streaming.bitrate} kbps</div>
                <div>URL: {streaming.stream_url}</div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Settings size={20} color="#64748b" />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>Device Settings</div>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                Connect a device to view and configure settings
              </div>
            </GlassCard>
          )}

          <GlassCard style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Connection Info</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Total Devices:</strong> {devices.length}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Connected:</strong> {connectedCount}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Available:</strong> {devices.filter(d => d.status === 'disconnected').length}
              </div>
              <div>
                <strong>Protocol:</strong> Bluetooth 5.0 LE
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
