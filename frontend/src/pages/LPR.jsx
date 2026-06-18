import React, { useState, useEffect } from 'react';
import { PageHeader, GlassCard, LiveBadge } from '../components/shared/index.jsx';
import { CheckCircle, AlertTriangle, Fingerprint, Upload, Loader } from 'lucide-react';
import { recognizePlateMulti, getPipelineResult } from '../api/client';

const TrustBar = ({ label, value, color, delay }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => { setTimeout(() => setWidth(value), delay); }, [value, delay]);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 3, transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
};

export default function LPR() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fused, setFused] = useState(false);

  useEffect(() => {
    const cached = getPipelineResult();
    if (cached?.module4_lpr?.verified) {
      setResult(cached.module4_lpr);
      setFused(true);
    }
  }, []);

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setLoading(true);
    try {
      const data = files.length > 1
        ? await recognizePlateMulti(files)
        : await recognizePlateMulti([files[0]]);
      setResult(data);
      setTimeout(() => setFused(true), 400);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const frames = result?.frames || [];
  const plate = result?.fused_plate;
  const trust = result?.trust_score || 0;

  return (
    <div className="page-enter">
      <PageHeader
        title="LPR & Identity Fusion"
        subtitle="Module 4 — Multi-frame OCR fusion and trust scoring engine"
        badge={<LiveBadge label={loading ? 'PROCESSING' : fused ? 'VERIFIED' : 'READY'} />}
        actions={
          <label className="btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Upload Frames
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files)} />
          </label>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Fused Final Plate</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: '#ffffff', padding: '12px 24px', borderRadius: 12, border: '2px solid #e2e8f0' }}>
              <div style={{ position: 'absolute', width: 24, background: '#4f46e5' }} />
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 42, fontWeight: 800, color: '#0f172a', letterSpacing: '0.1em' }}>
                {loading ? '...' : fused && plate ? plate : '— — — — — —'}
              </div>
            </div>
            {fused && plate && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, color: '#059669' }}>
                <CheckCircle size={16} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Trust Score {trust}% — {result?.validation_passed ? 'Format Validated' : 'Pending Validation'}</span>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Multi-Frame Extraction</div>
            {frames.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(frames.length, 4)}, 1fr)`, gap: 12 }}>
                {frames.map((f) => (
                  <div key={f.frame_id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Frame {f.frame_id}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>{f.plate || 'N/A'}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Conf: {f.confidence}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>Upload 1–6 frames for multi-frame OCR fusion</div>
            )}
          </div>

          {result?.vahan?.found && (
            <div className="glass-card" style={{ padding: 20, border: '1px solid #fde68a', background: '#fffbeb' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>VAHAN Registry Match</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                {result.vahan.vehicle_type} • {result.vahan.total_violations} prior violations
                {result.vahan.known_offender && <strong style={{ color: '#dc2626' }}> — Known repeat offender</strong>}
              </div>
            </div>
          )}
          {result?.tampering && (
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} color={result.tampering.tampered ? '#dc2626' : '#059669'} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tampering Check: {result.tampering.tampered ? 'Suspicious' : 'Clear'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>{result.tampering.reason}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <Fingerprint size={18} color="#4f46e5" />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Trust Score</div>
            </div>
            <TrustBar label="OCR Confidence" value={result?.ocr_confidence || 0} color="#4f46e5" delay={100} />
            <TrustBar label="Frame Agreement" value={result?.frame_agreement || 0} color="#7c3aed" delay={400} />
            <TrustBar label="Visibility/Contrast" value={frames[0]?.quality?.visibility || 0} color="#059669" delay={700} />
            <TrustBar label="Validation" value={result?.validation_passed ? 100 : 40} color="#0891b2" delay={1000} />
            <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Composite Trust Level</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 800, color: '#4f46e5' }}>{fused ? `${trust}%` : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
