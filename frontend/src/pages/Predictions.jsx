import React, { useState, useEffect } from 'react';
import { PageHeader, StatCounter } from '../components/shared/index.jsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CloudRain, TrendingUp, ShieldAlert, Calendar } from 'lucide-react';
import { getForecast, getDeployments } from '../api/client';

export default function Predictions() {
  const [forecast, setForecast] = useState(null);
  const [deployments, setDeployments] = useState(null);

  useEffect(() => {
    Promise.all([getForecast(), getDeployments()])
      .then(([f, d]) => { setForecast(f); setDeployments(d); })
      .catch(console.error);
  }, []);

  const forecastData = forecast?.weekly_forecast || [];

  return (
    <div className="page-enter">
      <PageHeader title="Predictive Intelligence" subtitle="Module 8 — AI-powered forecasting and deployment planning" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Forecasted Violations (Next 7 Days)', val: forecast?.expected_violations ?? 0, icon: TrendingUp, color: '#4f46e5' },
          { label: 'Weather Risk Factor', val: forecast?.weather_risk ?? '+0%', icon: CloudRain, color: '#0891b2', raw: true },
          { label: 'High Risk Zones', val: forecast?.high_risk_zones?.length ?? 0, icon: ShieldAlert, color: '#dc2626' },
          { label: 'Recommended Deployments', val: deployments?.total_deployments ?? 0, icon: Calendar, color: '#059669' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
              {s.raw ? s.val : <StatCounter value={s.val} />}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>7-Day Predictive Forecast</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="expected" stroke="#7c3aed" strokeWidth={3} fill="url(#predGrad)" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
          {forecast?.explanation && (
            <div style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
              {forecast.explanation.map((line, i) => <div key={i}>• {line}</div>)}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Deployment Recommendations</div>
          {(deployments?.recommendations || []).map((r, i) => (
            <div key={i} style={{ padding: 14, marginBottom: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.zone}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'white', background: r.priority === 'critical' ? '#dc2626' : '#ea580c', padding: '2px 8px', borderRadius: 12 }}>{r.priority.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{r.time}</div>
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>Deploy {r.units} enforcement units</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
