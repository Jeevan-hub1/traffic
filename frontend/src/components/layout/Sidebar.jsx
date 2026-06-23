import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Activity, Cpu, AlertTriangle,
  CreditCard, FileText, BarChart3, TrendingUp,
  Gauge, MessageSquare, ChevronLeft, ChevronRight,
  Eye, Zap, Radio, Bluetooth,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { to: '/command-center', icon: LayoutDashboard, label: 'Command Center', badge: '8' },
      { to: '/pipeline', icon: Activity, label: 'AI Pipeline' },
      { to: '/replay', icon: Eye, label: 'Violation Replay' },
    ]
  },
  {
    label: 'Detection Modules',
    items: [
      { to: '/quality', icon: Zap, label: 'M1 · Image Quality' },
      { to: '/detection', icon: Cpu, label: 'M2 · Scene Detection' },
      { to: '/violations', icon: AlertTriangle, label: 'M3 · Verification' },
      { to: '/lpr', icon: CreditCard, label: 'M4 · LPR Engine' },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/evidence', icon: FileText, label: 'M5 · Evidence' },
      { to: '/analytics', icon: BarChart3, label: 'M6 · Analytics' },
      { to: '/intelligence', icon: Radio, label: 'Threat Intel' },
      { to: '/predictions', icon: TrendingUp, label: 'M8 · Predictions' },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/evaluation', icon: Gauge, label: 'M7 · Evaluation' },
      { to: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
      { to: '/bluetooth', icon: Bluetooth, label: 'Bluetooth Camera' },
    ]
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid #e8edf5',
        boxShadow: '2px 0 12px rgba(15,23,74,0.05)',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 16px', borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
        }}>
          <Shield size={18} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>
              SafeVision
            </div>
            <div style={{ fontSize: 10, color: '#4f46e5', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Platform
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, color: '#94a3b8', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '2px 12px 8px',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
                title={collapsed ? item.label : undefined}
                style={{
                  marginBottom: 2,
                  display: 'flex',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : undefined,
                }}
              >
                <item.icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background: '#dc2626', color: 'white',
                        fontSize: 9, fontWeight: 800, minWidth: 17, height: 17,
                        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* System Status */}
      {!collapsed && (
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              System Status
            </div>
            {[
              { label: 'Detection Model', status: 'Online' },
              { label: 'OCR Engine', status: 'Online' },
              { label: 'Analytics', status: 'Online' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
                <span style={{ fontSize: 10, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute', top: 72, right: -12,
          width: 24, height: 24, borderRadius: '50%',
          background: '#ffffff', border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(15,23,74,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#64748b', zIndex: 20,
          transition: 'all 0.2s',
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
