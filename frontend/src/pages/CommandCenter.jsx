import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Camera, TrendingUp, Activity, Users, Zap, ArrowUp, ArrowDown, ChevronRight, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatCounter, SeverityBadge, LiveBadge, PageHeader, GlassCard, Chip } from '../components/shared/index.jsx';
import { getCommandCenter } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const C = { bg: '#ffffff', text: '#0f172a', sub: '#64748b', muted: '#94a3b8', border: '#e8edf5', surface: '#f8fafc' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 12px rgba(15,23,74,0.1)', fontSize: 12 }}>
        <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#4f46e5', fontWeight: 700 }}>{payload[0]?.value} violations</div>
      </div>
    );
  }
  return null;
};

const statCardDefs = [
  { key: 'totalToday', label: 'Violations Today', icon: AlertTriangle, color: '#4f46e5', bg: '#eef2ff', changeKey: 'wowChange', changeLabel: 'WoW' },
  { key: 'activeAlerts', label: 'Active Alerts', icon: Zap, color: '#dc2626', bg: '#fef2f2', change: '+3', up: true, pulse: true },
  { key: 'camerasOnline', label: 'Cameras Online', icon: Camera, color: '#059669', bg: '#ecfdf5', totalKey: 'camerasTotal' },
  { key: 'evidenceGenerated', label: 'Evidence Generated', icon: Shield, color: '#7c3aed', bg: '#f5f3ff', change: '+8%', up: true },
  { key: 'pendingReview', label: 'Pending Review', icon: Activity, color: '#d97706', bg: '#fffbeb', change: '-2', up: false },
  { key: 'riskScore', label: 'Risk Score', icon: TrendingUp, color: '#db2777', bg: '#fdf2f8', suffix: '/100' },
];

export default function CommandCenter() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [liveViolations, setLiveViolations] = useState([]);

  useEffect(() => {
    getCommandCenter().then((data) => {
      setDashboard(data);
      setLiveViolations(data.live_feed || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!dashboard?.live_feed?.length) return;
    const interval = setInterval(() => {
      setLiveViolations((prev) => {
        const item = dashboard.live_feed[Math.floor(Math.random() * dashboard.live_feed.length)];
        if (!item) return prev;
        return [{ ...item, id: `${item.id}-${Date.now()}`, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 8);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [dashboard]);

  const stats = dashboard?.stats || {};
  const violationTrend = dashboard?.trend || [];
  const hourlyTrend = dashboard?.hourly_trend || [];
  const violationTypes = (dashboard?.violation_types || []).map((v, i) => ({
    ...v,
    color: ['#4f46e5', '#dc2626', '#d97706', '#059669', '#7c3aed'][i % 5],
    value: v.value,
  }));
  const totalType = violationTypes.reduce((s, v) => s + v.value, 0) || 1;
  const junctions = (dashboard?.junctions || []).map((j) => ({
    name: j.name,
    violations: j.violations,
    violations_today: j.violations_today,
    safetyScore: j.safety_score,
    riskLevel: j.risk,
    trend: j.trend,
  }));
  const deploymentRec = dashboard?.deployment_recommendations || {};
  const repeatOffenders = (dashboard?.repeat_offenders || []).map((o) => ({
    plate: o.plate,
    violations: o.violations,
    last_seen: o.last_seen,
    threat_score: o.threat_score,
    known_offender: o.known_offender,
  }));

  // Bengaluru coordinates with realistic junction locations
  const centerPosition = [12.9716, 77.5946];
  
  // Realistic Bengaluru junction coordinates
  const junctionCoordinates = [
    { name: "MG Road Metro", lat: 12.9756, lng: 77.6066 },
    { name: "Indiranagar 100ft Road", lat: 12.9786, lng: 77.6406 },
    { name: "Koramangala Sony Signal", lat: 12.9356, lng: 77.6246 },
    { name: "Electronic City Toll", lat: 12.8456, lng: 77.6646 },
    { name: "Whitefield Main Road", lat: 12.9696, lng: 77.7486 },
    { name: "Silk Board Junction", lat: 12.9176, lng: 77.6236 },
  ];

  const [mapError, setMapError] = useState(false);

  return (
    <div className="page-enter">
      <PageHeader
        title="Traffic Command Center"
        subtitle="Real-time enforcement intelligence and operations dashboard"
        badge={<LiveBadge label="LIVE OPS" />}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/intelligence')}>Threat Intel</button>
            <button className="btn-primary" onClick={() => navigate('/pipeline')}>Run Pipeline</button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
        {statCardDefs.map(s => {
          const changeValue = s.changeKey ? stats[s.changeKey] : s.change;
          const totalValue = s.totalKey ? stats[s.totalKey] : null;
          const isUp = changeValue > 0;
          const isDown = changeValue < 0;
          return (
            <div key={s.label} className="glass-card" style={{ padding: 18, ...(s.pulse ? { animation: 'pulse-critical 2s ease-in-out infinite', borderColor: '#fecaca' } : {}) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={15} color={s.color} />
                </div>
                {changeValue !== undefined && changeValue !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, color: isUp ? '#059669' : isDown ? '#dc2626' : '#94a3b8', background: isUp ? '#ecfdf5' : isDown ? '#fef2f2' : '#f1f5f9', padding: '2px 6px', borderRadius: 12 }}>
                    {isUp ? <ArrowUp size={8} /> : isDown ? <ArrowDown size={8} /> : null}
                    {typeof changeValue === 'number' ? `${changeValue.toFixed(1)}%` : changeValue}
                    {s.changeLabel && <span style={{ marginLeft: 2, color: '#64748b' }}>{s.changeLabel}</span>}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginBottom: 3 }}>
                <StatCounter value={stats[s.key] || 0} />{s.suffix}
                {totalValue !== null && <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}> / {totalValue}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16, marginBottom: 16 }}>
        {/* Map View */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: 220 }}>
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} color="#4f46e5" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Camera Network</span>
            </div>
          </div>
          {mapError ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <MapPin size={32} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>Map Unavailable</div>
              </div>
            </div>
          ) : (
            <MapContainer center={centerPosition} zoom={12} style={{ height: 220, width: '100%' }} onError={() => setMapError(true)}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {junctions.slice(0, 6).map((j, i) => {
                const coord = junctionCoordinates[i] || junctionCoordinates[0];
                return (
                  <CircleMarker
                    key={j.name}
                    center={[coord.lat, coord.lng]}
                    radius={j.safetyScore < 40 ? 18 : j.safetyScore < 65 ? 14 : 10}
                    fillColor={j.safetyScore < 40 ? '#dc2626' : j.safetyScore < 65 ? '#d97706' : '#059669'}
                    color={j.safetyScore < 40 ? '#dc2626' : j.safetyScore < 65 ? '#d97706' : '#059669'}
                    weight={2}
                    opacity={0.8}
                  >
                    <Popup>
                      <div style={{ padding: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{coord.name}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{j.violations} violations</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Score: {j.safetyScore}/100</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Violation Trend */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Violation Trend — Today</div>
            <LiveBadge label="UPDATING" />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={violationTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="violations" stroke="#4f46e5" strokeWidth={2} fill="url(#violGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Violation Types */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Violation Distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={violationTypes} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" strokeWidth={0}>
                  {violationTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {violationTypes.map(v => (
                <div key={v.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: v.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#64748b' }}>{v.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{Math.round((v.value / totalType) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Active Alerts</div>
          {junctions.slice(0, 3).map(j => (
            <div key={j.name} className="glass-card-hover" style={{ padding: 11, marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('/intelligence')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{j.name}</div>
                <SeverityBadge severity={j.riskLevel === 'critical' ? 'critical' : j.riskLevel === 'high' ? 'high' : 'medium'} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{j.violations} violations (week) • {j.violations_today} today</div>
              {j.trend !== undefined && (
                <div style={{ fontSize: 10, color: j.trend > 0 ? '#dc2626' : j.trend < 0 ? '#059669' : '#94a3b8', marginTop: 2 }}>
                  {j.trend > 0 ? '↑' : j.trend < 0 ? '↓' : '→'} {Math.abs(j.trend).toFixed(1)}% vs last week
                </div>
              )}
              {j.riskLevel === 'critical' && (
                <div style={{ height: 2, background: '#fecaca', borderRadius: 1, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${100 - j.safetyScore}%`, background: '#dc2626', borderRadius: 1 }} />
                </div>
              )}
            </div>
          ))}
          <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 4 }} onClick={() => navigate('/intelligence')}>
            View All Alerts
          </button>
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px 300px', gap: 16 }}>
        {/* Live Feed */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Live Violation Feed</div>
            <LiveBadge />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 260 }}>
            {liveViolations.map((v, i) => (
              <div key={`${v.id}-${i}`} className="glass-card-hover"
                style={{ padding: '10px 12px', marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, animation: i === 0 ? 'slideInRight 0.4s ease-out' : undefined }}
                onClick={() => navigate('/evidence')}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={14} color="#4f46e5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{v.type}</span>
                    <SeverityBadge severity={v.severity} />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6 }}>
                    <span className="font-plate" style={{ color: '#4f46e5', fontWeight: 600 }}>{v.plate}</span>
                    <span>·</span><span>{v.location}</span>
                    <span>·</span><span>{v.time}</span>
                  </div>
                </div>
                <ChevronRight size={12} color="#c4c9d4" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Offenders */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Top Offenders</div>
          {repeatOffenders.slice(0, 5).map((o, i) => (
            <div key={o.plate} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 800, color: i === 0 ? '#dc2626' : '#94a3b8', width: 18 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-plate" style={{ fontSize: 12, color: '#4f46e5', fontWeight: 700, marginBottom: 3 }}>{o.plate}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {o.known_offender && <span style={{ color: '#dc2626', fontWeight: 600 }}>Known Offender</span>}
                  {o.last_seen && <span> • Last: {o.last_seen}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 800, color: o.violations >= 5 ? '#dc2626' : '#d97706' }}>{o.violations}</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>violations</div>
              </div>
            </div>
          ))}
        </div>

        {/* Junction Safety */}
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Junction Safety Ranking</div>
          {junctions.map((j, i) => (
            <div key={j.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 16 }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{j.name}</div>
                  {j.trend !== undefined && (
                    <div style={{ fontSize: 9, color: j.trend > 0 ? '#dc2626' : j.trend < 0 ? '#059669' : '#94a3b8' }}>
                      {j.trend > 0 ? '↑' : j.trend < 0 ? '↓' : '→'} {Math.abs(j.trend).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${j.safetyScore}%`, background: j.safetyScore < 40 ? '#dc2626' : j.safetyScore < 65 ? '#d97706' : '#059669', borderRadius: 2, transition: 'width 1s ease-out' }} />
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{j.violations_today} today</div>
              </div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 800, color: j.safetyScore < 40 ? '#dc2626' : j.safetyScore < 65 ? '#d97706' : '#059669', width: 28, textAlign: 'right' }}>
                {j.safetyScore}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
