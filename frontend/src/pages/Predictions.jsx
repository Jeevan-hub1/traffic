import React, { useState, useEffect } from 'react';
import { PageHeader, StatCounter } from '../components/shared/index.jsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { CloudRain, TrendingUp, ShieldAlert, Calendar, Activity, AlertTriangle } from 'lucide-react';
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
  
  // Prepare data for confidence interval chart
  const chartData = forecastData.map(f => ({
    day: f.day,
    expected: f.expected,
    confidence_low: f.confidence_low,
    confidence_high: f.confidence_high,
    risk: f.risk,
  }));

  return (
    <div className="page-enter">
      <PageHeader title="Predictive Intelligence" subtitle="Module 8 — AI-powered forecasting and deployment planning" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Forecasted Violations (Next 7 Days)', val: forecast?.expected_violations ?? 0, icon: TrendingUp, color: '#4f46e5' },
          { label: 'Trend Direction', val: forecast?.trend_direction || 'stable', icon: Activity, color: '#7c3aed', raw: true },
          { label: 'Model Confidence', val: `${forecast?.model_confidence ?? 0}%`, icon: ShieldAlert, color: '#059669', raw: true },
          { label: 'Volatility Index', val: forecast?.volatility ?? 0, icon: CloudRain, color: '#0891b2', raw: true },
          { label: 'Recommended Deployments', val: deployments?.total_deployments ?? 0, icon: Calendar, color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
              {s.raw ? s.val : <StatCounter value={s.val} />}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anomaly Detection Alert */}
      {forecast?.anomalies && forecast.anomalies.length > 0 && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span style={{ fontWeight: 700, color: '#dc2626' }}>Anomalies Detected</span>
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>
            {forecast.anomalies.map((a, i) => <div key={i}>• {a}</div>)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            7-Day Predictive Forecast with Confidence Intervals
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="confidence_high" stroke="#94a3b8" strokeWidth={1} fill="url(#confGrad)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="confidence_low" stroke="#94a3b8" strokeWidth={1} fill="url(#confGrad)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="expected" stroke="#7c3aed" strokeWidth={3} fill="url(#predGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Legend:</strong> Purple line = Expected violations, Gray dashed lines = 95% confidence interval
            </div>
            {forecast?.explanation && forecast.explanation.map((line, i) => <div key={i}>• {line}</div>)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Deployment Recommendations
          </div>
          {(deployments?.recommendations || []).map((r, i) => (
            <div key={i} style={{ padding: 14, marginBottom: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.zone}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'white', background: r.priority === 'critical' ? '#dc2626' : r.priority === 'high' ? '#ea580c' : '#0891b2', padding: '2px 8px', borderRadius: 12 }}>{r.priority.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{r.time}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>Deploy {r.units} enforcement units</span>
                <span style={{ fontSize: 10, color: r.trend === 'increasing' ? '#dc2626' : r.trend === 'decreasing' ? '#059669' : '#64748b', fontWeight: 600 }}>
                  {r.trend === 'increasing' ? '↑' : r.trend === 'decreasing' ? '↓' : '→'} {r.trend}
                </span>
              </div>
              {r.rationale && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>{r.rationale}</div>
              )}
            </div>
          ))}
          {deployments?.deployment_strategy && (
            <div style={{ marginTop: 12, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              Strategy: {deployments.deployment_strategy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
