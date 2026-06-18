import React, { useState, useEffect } from 'react';
import { PageHeader, GlassCard, ThreatMeter, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import { CheckCircle, AlertTriangle, ShieldAlert, Upload, Loader } from 'lucide-react';
import { verifyViolations, detectObjects, getPipelineResult } from '../api/client';

export default function Violations() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cached = getPipelineResult();
    if (cached?.module3_violation) setResult(cached.module3_violation);
  }, []);

  const runFromUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const detection = await detectObjects(file);
      const verification = await verifyViolations({
        violation_candidates: detection.violation_candidates || [],
        structured_scene: detection.structured_scene || [],
        frames_analyzed: 1,
        road_context: detection.scene?.road_context,
      });
      setResult(verification);
    } catch (e) {
      setError(e.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const violations = result?.violations || [];
  const steps = result?.verification_steps || [];
  const timeline = result?.timeline || [];

  return (
    <div className="page-enter">
      <PageHeader
        title="Violation Verification Engine"
        subtitle="Module 3 — Multi-layered rule verification and threat scoring"
        badge={<LiveBadge label={loading ? 'VERIFYING' : result?.verified ? 'CONFIRMED' : 'READY'} />}
        actions={
          <label className="btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Verify Image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && runFromUpload(e.target.files[0])} />
          </label>
        }
      />

      {loading && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#4f46e5' }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Running hierarchical verification...
        </div>
      )}
      {error && <div className="glass-card" style={{ padding: 16, marginBottom: 20, color: '#dc2626', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {result?.composite && violations.length > 1 ? (
            <div className="glass-card" style={{ padding: 24, border: '2px solid #fecaca', background: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <ShieldAlert size={28} color="#dc2626" />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: '#dc2626' }}>COMPOSITE VIOLATION DETECTED</div>
                  <div style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>Multiple violations on a single vehicle</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {violations.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#ffffff', borderRadius: 12, border: '1px solid #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <AlertTriangle size={20} color={v.severity === 'high' || v.severity === 'critical' ? '#dc2626' : '#d97706'} />
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{v.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>{v.evidence_detail}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <SeverityBadge severity={v.severity} />
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>Conf: {v.confidence}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : violations.length ? (
            violations.map((v, i) => (
              <div key={i} className="glass-card" style={{ padding: 20, border: '1px solid #fecaca' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{v.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{v.explanation || v.evidence_detail}</div>
              </div>
            ))
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Upload an image or run the pipeline to verify violations
            </div>
          )}

          {steps.length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Hierarchical Verification Process</div>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12, opacity: s.status === 'skip' ? 0.6 : 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.status === 'pass' ? '#ecfdf5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.status === 'pass' ? <CheckCircle size={14} color="#059669" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{s.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.status === 'pass' ? '#059669' : '#64748b', textTransform: 'uppercase' }}>{s.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 20 }}>Composite Threat Score</div>
            <ThreatMeter score={result?.threat_score || 0} size={180} />
          </div>

          {timeline.length > 0 && (
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>Violation Timeline</div>
              {timeline.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 45, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#94a3b8' }}>{v.t}</div>
                  <div style={{ flex: 1, fontSize: 12, color: v.type === 'critical' ? '#dc2626' : v.type === 'violation' ? '#ea580c' : '#334155', fontWeight: v.type === 'critical' ? 600 : 400 }}>{v.ev}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
