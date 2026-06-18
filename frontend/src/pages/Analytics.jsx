import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PageHeader, StatCounter } from '../components/shared/index.jsx';
import { getAnalyticsSummary, getAnalyticsTrends, getAnalyticsInsights } from '../api/client';
import { TrendingUp, Users, Target, Clock } from 'lucide-react';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getAnalyticsTrends(), getAnalyticsInsights()])
      .then(([s, t, i]) => { setSummary(s); setTrends(t); setInsights(i); })
      .catch(console.error);
  }, []);

  const violationTypes = summary?.violation_types?.map((v) => ({
    ...v,
    color: v.color || '#4f46e5',
    pct: summary.total_violations ? Math.round((v.value / summary.total_violations) * 100) : 0,
  })) || [];

  const timeDistribution = trends?.time_distribution || [];

  return (
    <div className="page-enter">
      <PageHeader title="Analytics & Insights" subtitle="Module 6 — Deep dive into violation patterns and system performance" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Violations', val: summary?.total_violations ?? 0, icon: Target, color: '#4f46e5' },
          { label: 'Avg Verification Time', val: summary?.avg_verification_ms ?? 82, icon: Clock, color: '#059669', suffix: 'ms' },
          { label: 'Repeat Offenders', val: summary?.repeat_offender_count ?? 0, icon: Users, color: '#d97706' },
          { label: 'Trend vs Last Week', val: summary?.trend_vs_last_week ?? 0, icon: TrendingUp, color: '#dc2626', prefix: '+', suffix: '%' },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                {s.prefix}<StatCounter value={s.val} />{s.suffix}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>7-Day Violation Volume</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trends?.trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <Area type="monotone" dataKey="violations" stroke="#4f46e5" strokeWidth={3} fill="url(#colorTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Violation Types</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={violationTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {violationTypes.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 16 }}>
            {violationTypes.map((v) => (
              <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{v.name}</span>
                <span style={{ fontWeight: 700 }}>{v.value} ({v.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Time-of-Day Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={24}>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="val" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Actionable Insights</div>
          {(insights?.insights || []).map((item, i) => (
            <div key={i} style={{ padding: 14, marginBottom: 12, background: item.priority === 'high' ? '#fef2f2' : item.priority === 'medium' ? '#fffbeb' : '#eef2ff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
