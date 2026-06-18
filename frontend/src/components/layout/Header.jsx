import React, { useState, useEffect } from 'react';
import { Bell, Search, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCommandCenter } from '../../api/client';

export default function Header() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [searchVal, setSearchVal] = useState('');
  const [stats, setStats] = useState({ camerasOnline: 0, activeAlerts: 0 });
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getCommandCenter()
      .then((d) => setStats(d.stats || {}))
      .catch(() => {});
    const refresh = setInterval(() => {
      getCommandCenter().then((d) => setStats(d.stats || {})).catch(() => {});
    }, 30000);
    return () => clearInterval(refresh);
  }, []);

  const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchVal(query);
    if (e.key === 'Enter' && query.trim()) {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('plate') || /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/i.test(query)) {
        navigate('/intelligence', { state: { searchQuery: query } });
      } else if (lowerQuery.includes('case') || lowerQuery.includes('evidence')) {
        navigate('/evidence');
      } else if (lowerQuery.includes('violation')) {
        navigate('/violations');
      } else if (lowerQuery.includes('analytics') || lowerQuery.includes('trend')) {
        navigate('/analytics');
      } else {
        navigate('/intelligence', { state: { searchQuery: query } });
      }
    }
  };

  return (
    <header style={{
      height: 60, background: '#ffffff', borderBottom: '1px solid #e8edf5',
      boxShadow: '0 1px 4px rgba(15,23,74,0.05)',
      display: 'flex', alignItems: 'center', paddingLeft: 24, paddingRight: 24, gap: 16, flexShrink: 0, zIndex: 9,
    }}>
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={searchVal}
          onChange={handleSearch}
          onKeyDown={handleSearch}
          placeholder="Search plate, case ID, violation..."
          style={{
            width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
            background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#059669', fontWeight: 500 }}>
        <Camera size={13} />
        <span>{stats.camerasOnline || 4} cameras online</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s ease-in-out infinite' }} />
        {stats.activeAlerts || 0} alerts
      </div>

      <div style={{ width: 1, height: 22, background: '#e8edf5' }} />

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{formatTime(time)}</div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>{formatDate(time)}</div>
      </div>

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowAlerts(!showAlerts)}
          style={{ position: 'relative', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 7, cursor: 'pointer' }}
        >
          <Bell size={15} color="#64748b" />
          {(stats.activeAlerts > 0) && (
            <span style={{
              position: 'absolute', top: -4, right: -4, background: '#dc2626', width: 15, height: 15,
              borderRadius: '50%', fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
            }}>{stats.activeAlerts}</span>
          )}
        </button>
        {showAlerts && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8,
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(15,23,74,0.12)', padding: 16,
            width: 280, zIndex: 100,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#0f172a' }}>Active Alerts</div>
            {stats.activeAlerts > 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, marginBottom: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Red Light Violation</div>
                  <div style={{ fontSize: 11 }}>Camera #12 - MH01AB1234</div>
                </div>
                <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, marginBottom: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>No Helmet Detected</div>
                  <div style={{ fontSize: 11 }}>Camera #08 - MH02CD5678</div>
                </div>
                <button 
                  onClick={() => { setShowAlerts(false); navigate('/violations'); }}
                  style={{ width: '100%', padding: 8, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  View All Alerts
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>No active alerts</div>
            )}
          </div>
        )}
      </div>

      <div style={{
        width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white',
      }}>OA</div>
    </header>
  );
}
