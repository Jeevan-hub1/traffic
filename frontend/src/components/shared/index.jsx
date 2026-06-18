import React, { useEffect, useRef, useState } from 'react';

export function StatCounter({ value, duration = 1200, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const animate = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * value));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref} className="font-num">{prefix}{count.toLocaleString()}{suffix}</span>;
}

export function SeverityBadge({ severity }) {
  return <span className={`severity-${severity}`}>{severity}</span>;
}

export function LiveBadge({ label = 'LIVE' }) {
  return (
    <span className="live-badge">
      <span className="live-dot" />
      {label}
    </span>
  );
}

export function QualityGauge({ score, size = 100, label }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
  const trackColor = score >= 80 ? '#ecfdf5' : score >= 60 ? '#fffbeb' : '#fef2f2';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: '#0f172a', fontSize: size * 0.2, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>
          {score}
        </text>
        <text x={size / 2} y={size / 2 + size * 0.17} textAnchor="middle"
          style={{ fill: '#94a3b8', fontSize: size * 0.1, fontFamily: 'Inter,sans-serif' }}>
          /100
        </text>
      </svg>
      {label && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textAlign: 'center' }}>{label}</div>}
    </div>
  );
}

export function ThreatMeter({ score, size = 140 }) {
  const color = score >= 80 ? '#dc2626' : score >= 60 ? '#ea580c' : score >= 40 ? '#d97706' : '#059669';
  const label = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  const bg = score >= 80 ? '#fef2f2' : score >= 60 ? '#fff7ed' : score >= 40 ? '#fffbeb' : '#ecfdf5';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <QualityGauge score={score} size={size} />
      <span style={{
        fontSize: 10, color, fontWeight: 800, letterSpacing: '0.1em',
        background: bg, padding: '2px 10px', borderRadius: 20, border: `1px solid ${color}40`,
      }}>
        {label}
      </span>
    </div>
  );
}

export function Timeline({ events }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((ev, i) => {
        const colors = { info: '#4f46e5', warning: '#d97706', violation: '#ea580c', critical: '#dc2626', normal: '#059669' };
        const bgs = { info: '#eef2ff', warning: '#fffbeb', violation: '#fff7ed', critical: '#fef2f2', normal: '#ecfdf5' };
        const color = colors[ev.type] || '#4f46e5';
        return (
          <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: color,
                flexShrink: 0, marginTop: 3,
                border: `2px solid ${color}30`,
                boxShadow: `0 0 0 3px ${bgs[ev.type] || '#eef2ff'}`,
              }} />
              {i < events.length - 1 && (
                <div style={{ width: 1.5, flex: 1, background: '#e2e8f0', minHeight: 18 }} />
              )}
            </div>
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{ev.time}</div>
              <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>{ev.event}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GlassCard({ children, className = '', style = {}, onClick }) {
  return (
    <div className={`glass-card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 22,
            fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

export function MetricBar({ label, value, max = 100, color = '#4f46e5' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${(value / max) * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          borderRadius: 3, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

export function Chip({ label, color = '#4f46e5' }) {
  const bg = color === '#4f46e5' ? '#eef2ff' : `${color}15`;
  const border = color === '#4f46e5' ? '#c7d2fe' : `${color}30`;
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 20,
      background: bg, border: `1px solid ${border}`,
      color, fontSize: 10, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}
