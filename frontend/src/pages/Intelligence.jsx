import React, { useState, useEffect } from 'react';
import { PageHeader, GlassCard, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import { ShieldAlert, Crosshair, Map, Activity, Radio, AlertOctagon, Camera, Zap, TrendingUp, Eye, Lock } from 'lucide-react';
import { getRiskZones, getCommandCenter, getAnalyticsSummary } from '../api/client';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Pulsing animation style
const pulseStyle = {
  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 }
  }
};

export default function Intelligence() {
  const [zones, setZones] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [feed, setFeed] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    // Add pulse animation to document
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-scale {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .zone-pulse {
          animation: pulse-scale 2s ease-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    Promise.all([getRiskZones(), getCommandCenter(), getAnalyticsSummary()])
      .then(([z, cc, summary]) => {
        setZones(z.zones || []);
        setJunctions(cc.junctions || []);
        setFeed(summary.recent_feed || []);
      })
      .catch(console.error);
  }, []);

  const criticalZones = zones.filter((z) => z.risk > 70).length;

  // Bengaluru coordinates with realistic junction locations
  const centerPosition = [12.9716, 77.5946];
  
  // Realistic Bengaluru junction coordinates with zone info
  const junctionCoordinates = [
    { name: "MG Road Metro", lat: 12.9756, lng: 77.6066, risk: 'critical' },
    { name: "Indiranagar 100ft Road", lat: 12.9786, lng: 77.6406, risk: 'critical' },
    { name: "Koramangala Sony Signal", lat: 12.9356, lng: 77.6246, risk: 'high' },
    { name: "Electronic City Toll", lat: 12.8456, lng: 77.6646, risk: 'medium' },
    { name: "Whitefield Main Road", lat: 12.9696, lng: 77.7486, risk: 'medium' },
    { name: "Silk Board Junction", lat: 12.9176, lng: 77.6236, risk: 'critical' },
  ];

  // Create critical zones data
  const criticalZonesData = junctionCoordinates.filter(j => j.risk === 'critical');

  const [mapError, setMapError] = useState(false);

  const getSafetyColor = (score) => {
    if (score < 40) return '#dc2626';
    if (score < 65) return '#d97706';
    return '#059669';
  };

  const getRiskColor = (risk) => {
    if (risk === 'critical') return '#dc2626';
    if (risk === 'high') return '#d97706';
    return '#059669';
  };

  return (
    <div className="page-enter">
      <PageHeader 
        title="Threat Intelligence Center" 
        subtitle="SOC-style real-time monitoring and threat assessment" 
        badge={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveBadge label="SOC ACTIVE" />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s infinite' }} />
              {criticalZones} CRITICAL
            </div>
          </div>
        } 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Enhanced Map */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: 480, position: 'relative' }}>
            {/* Critical Zones Indicator */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: '#ffffff', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tactical Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{criticalZones} Critical Zone(s) Active</span>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}>
                <div>🔴 {criticalZonesData.length} High-Risk Areas</div>
              </div>
            </div>

            {mapError ? (
              <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Map size={48} style={{ marginBottom: 16 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Map Unavailable</div>
                  <div style={{ fontSize: 12 }}>Unable to load map component</div>
                </div>
              </div>
            ) : (
              <MapContainer center={centerPosition} zoom={12} style={{ height: 480, width: '100%' }} onError={() => setMapError(true)}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Critical zone circles with pulse effect */}
                {criticalZonesData.map((zone) => (
                  <Circle
                    key={`zone-pulse-${zone.name}`}
                    center={[zone.lat, zone.lng]}
                    radius={500}
                    fillColor="#dc2626"
                    color="#dc2626"
                    weight={1}
                    opacity={0.2}
                    fillOpacity={0.1}
                  />
                ))}
                
                {junctions.map((j, i) => {
                  const coord = junctionCoordinates[i] || junctionCoordinates[0];
                  const isCritical = coord.risk === 'critical';
                  return (
                    <CircleMarker
                      key={j.name}
                      center={[coord.lat, coord.lng]}
                      radius={isCritical ? 22 : j.safety_score < 40 ? 20 : j.safety_score < 65 ? 15 : 10}
                      fillColor={getRiskColor(coord.risk)}
                      color={getRiskColor(coord.risk)}
                      weight={isCritical ? 3 : 2}
                      opacity={isCritical ? 1 : 0.8}
                      className={isCritical ? 'pulse-dot' : ''}
                    >
                      <Popup>
                        <div style={{ padding: 12, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: getRiskColor(coord.risk) }}>{coord.name}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, fontSize: 12 }}>
                            <div><span style={{ color: '#64748b' }}>Violations:</span> <strong>{j.violations}</strong></div>
                            <div><span style={{ color: '#64748b' }}>Safety:</span> <strong>{j.safety_score}/100</strong></div>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <SeverityBadge severity={j.risk} />
                          </div>
                          <button onClick={() => setSelectedZone(coord)} style={{ width: '100%', padding: '6px 12px', background: getRiskColor(coord.risk), color: '#ffffff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            )}
          </div>

          {/* Zone Details (Drill-Down) */}
          {selectedZone && (
            <div className="glass-card" style={{ padding: 20, border: `2px solid ${getRiskColor(selectedZone.risk)}`, background: selectedZone.risk === 'critical' ? '#fef2f2' : '#fefce8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={18} color={getRiskColor(selectedZone.risk)} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{selectedZone.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedZone.risk.toUpperCase()} THREAT ZONE
                  </div>
                </div>
                <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: '#ffffff', borderRadius: 6, border: `1px solid ${getRiskColor(selectedZone.risk)}20` }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>INCIDENTS TODAY</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: getRiskColor(selectedZone.risk) }}>24</div>
                </div>
                <div style={{ padding: 12, background: '#ffffff', borderRadius: 6, border: `1px solid ${getRiskColor(selectedZone.risk)}20` }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>AVG SEVERITY</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: getRiskColor(selectedZone.risk) }}>8.2/10</div>
                </div>
                <div style={{ padding: 12, background: '#ffffff', borderRadius: 6, border: `1px solid ${getRiskColor(selectedZone.risk)}20` }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>TREND</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={16} color="#dc2626" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>+18%</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 12, background: '#ffffff', borderRadius: 6, border: `1px solid ${getRiskColor(selectedZone.risk)}20` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Recent Violations</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  • Red-light crossing: 12 incidents<br/>
                  • Stop-line violation: 8 incidents<br/>
                  • Speeding: 4 incidents<br/>
                  • Lane deviation: 0 incidents
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Zone Threat Matrix */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Crosshair size={18} color="#4f46e5" />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700 }}>Zone Threat Matrix</div>
            </div>
            {junctions.map((j, i) => {
              const coord = junctionCoordinates[i] || junctionCoordinates[0];
              const isCritical = coord.risk === 'critical';
              return (
                <div 
                  key={j.name} 
                  onClick={() => setSelectedZone(coord)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: 12, 
                    marginBottom: 8, 
                    background: isCritical ? '#fef2f2' : '#f8fafc',
                    border: isCritical ? '1px solid #fecaca' : '1px solid transparent',
                    borderRadius: 8, 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCritical ? '#fee2e2' : '#f1f5f9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCritical ? '#fef2f2' : '#f8fafc';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{j.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{j.violations} violations {isCritical ? '🔴 CRITICAL' : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: getSafetyColor(j.safety_score) }}>{j.safety_score}/100</div>
                    <SeverityBadge severity={j.risk} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Critical Zones Summary */}
          <div className="glass-card" style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertOctagon size={18} color="#dc2626" />
              <div style={{ fontWeight: 700, color: '#dc2626' }}>Critical Zones Alert</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>{criticalZones}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Active high-threat zones requiring immediate attention</div>
              
              {criticalZonesData.map((zone) => (
                <div 
                  key={zone.name}
                  onClick={() => setSelectedZone(zone)}
                  style={{ 
                    padding: 8, 
                    background: '#ffffff', 
                    borderLeft: `3px solid #dc2626`,
                    borderRadius: 4,
                    marginBottom: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff7f7';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{zone.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📍 {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Threat Feed */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Radio size={18} color="#dc2626" />
              <div style={{ fontWeight: 700 }}>Live Threat Feed</div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {feed.map((v) => (
                <div key={v.id} style={{ padding: 10, marginBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s infinite' }} />
                    {v.type}
                  </div>
                  <div style={{ color: '#64748b' }}>{v.plate} • <SeverityBadge severity={v.severity} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal Enforcement Card */}
          <div className="glass-card" style={{ padding: 20, border: '1px solid #fecaca', background: '#fef2f2' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Eye size={16} color="#dc2626" />
              <span style={{ fontWeight: 700, color: '#dc2626' }}>Signal Enforcement</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
              Real-time verification of violations using live traffic signal state detection.
            </div>
            <div style={{ padding: 8, background: '#ffffff', borderRadius: 4, fontSize: 11, color: '#64748b' }}>
              <div>🔴 Red-Light: <strong>Active</strong></div>
              <div>🟡 Yellow: <strong>Tracking</strong></div>
              <div>🟢 Green: <strong>Safe</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
