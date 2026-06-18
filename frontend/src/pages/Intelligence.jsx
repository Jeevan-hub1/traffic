import React, { useState, useEffect } from 'react';
import { PageHeader, GlassCard, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import { ShieldAlert, Crosshair, Map, Activity, Radio, AlertOctagon } from 'lucide-react';
import { getRiskZones, getCommandCenter, getAnalyticsSummary } from '../api/client';

export default function Intelligence() {
  const [zones, setZones] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    Promise.all([getRiskZones(), getCommandCenter(), getAnalyticsSummary()])
      .then(([z, cc, summary]) => {
        setZones(z.zones || []);
        setJunctions(cc.junctions || []);
        setFeed(summary.recent_feed || []);
      })
      .catch(console.error);
  }, []);

  const criticalZones = zones.filter((z) => z.risk > 70).length;

  return (
    <div className="page-enter">
      <PageHeader title="Threat Intelligence Center" subtitle="SOC-style real-time monitoring and threat assessment" badge={<LiveBadge label="SOC ACTIVE" />} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 20, background: '#f8fafc', height: 320, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 20, left: 20, background: '#ffffff', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tactical Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{criticalZones} Critical Zone(s) Active</span>
              </div>
            </div>
            {zones.slice(0, 5).map((z, i) => (
              <div key={z.name} style={{
                position: 'absolute',
                top: `${25 + i * 12}%`,
                left: `${20 + i * 15}%`,
                width: 12,
                height: 12,
                background: z.risk > 70 ? '#dc2626' : z.risk > 50 ? '#ea580c' : '#059669',
                borderRadius: '50%',
              }} />
            ))}
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Crosshair size={18} color="#4f46e5" />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700 }}>Zone Threat Matrix</div>
            </div>
            {junctions.map((j) => (
              <div key={j.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, marginBottom: 8, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{j.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{j.violations} violations</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: j.safety_score < 40 ? '#dc2626' : '#d97706' }}>{j.safety_score}/100</div>
                  <SeverityBadge severity={j.risk} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Radio size={18} color="#dc2626" />
              <div style={{ fontWeight: 700 }}>Live Threat Feed</div>
            </div>
            {feed.map((v) => (
              <div key={v.id} style={{ padding: 10, marginBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{v.type}</div>
                <div style={{ color: '#64748b' }}>{v.plate} • <SeverityBadge severity={v.severity} /></div>
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ padding: 20, border: '1px solid #fecaca', background: '#fef2f2' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <AlertOctagon size={16} color="#dc2626" />
              <span style={{ fontWeight: 700, color: '#dc2626' }}>Signal-Aware Enforcement</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Red-light and stop-line violations are now verified using live traffic signal state detection (red / yellow / green).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
