import React, { useState } from 'react';
import { Upload, Zap, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { PageHeader, QualityGauge, GlassCard } from '../components/shared/index.jsx';
import { analyzeQuality } from '../api/client';

export default function Quality() {
  const [analyzed, setAnalyzed] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a traffic image first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeQuality(file);
      setResult(data);
      setAnalyzed(true);
      setEnhanced(true);
      if (data.enhanced_image) setImage(data.enhanced_image);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to analyze image. Is the backend running on port 8000?');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImage(URL.createObjectURL(selected));
    setAnalyzed(false);
    setEnhanced(false);
    setResult(null);
    setError(null);
  };

  const before = result?.quality_metrics?.before;
  const after = result?.quality_metrics?.after;
  const conditions = result?.conditions || [];

  return (
    <div className="page-enter">
      <PageHeader
        title="Vision Quality Analyzer"
        subtitle="Module 1 — Adaptive image enhancement for optimal computer vision performance"
      />

      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', flex: 1 }}>
            <div style={{
              border: '2px dashed #c7d2fe', borderRadius: 14, padding: 30, textAlign: 'center',
              background: '#f8fafc', transition: 'all 0.2s', height: 180, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              {image ? (
                <img src={image} alt="Uploaded" style={{ height: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }} />
              ) : (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Upload size={24} color="#4f46e5" />
                  </div>
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>Drop a traffic image or click to upload</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>PNG, JPG supported</div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
            <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing || !file} style={{ justifyContent: 'center', padding: '12px 20px', fontSize: 14 }}>
              {analyzing ? 'Analyzing...' : '🔍 Analyze & Enhance'}
            </button>
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, textAlign: 'center' }}>
              Upload a traffic image to analyze quality and apply adaptive enhancements automatically.
            </div>
          </div>
        </div>
      </div>

      {analyzed && result && (
        <div className="page-enter">
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>Quality Assessment Results</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
              <div style={{ textAlign: 'center' }}>
                <QualityGauge score={before?.overall_score || result.quality_score_before} size={140} label="Before Enhancement" />
                <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 800, marginTop: 8, background: '#fef2f2', padding: '4px 12px', borderRadius: 20, display: 'inline-block', border: '1px solid #fecaca' }}>LOW QUALITY</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={24} color="#64748b" />
                </div>
                {enhanced && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 20, padding: '4px 16px', fontSize: 13, fontWeight: 800, color: '#059669', boxShadow: '0 2px 8px rgba(5,150,105,0.15)', animation: 'fadeInUp 0.3s ease-out' }}>
                    +{result.improvement} pts
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <QualityGauge score={after?.overall_score || result.quality_score_after} size={140} label="After Enhancement" />
                {enhanced && <div style={{ fontSize: 11, color: '#059669', fontWeight: 800, marginTop: 8, background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, display: 'inline-block', border: '1px solid #a7f3d0' }}>OPTIMIZED</div>}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Image Conditions Detected</div>
              {conditions.map(c => (
                <div key={c.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{c.label}: </span>
                      <span style={{ fontSize: 13, color: c.score < 60 ? '#dc2626' : c.score < 75 ? '#d97706' : '#059669', fontWeight: 700 }}>{c.level}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{c.score}/100</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.score}%`, background: c.score < 60 ? '#ef4444' : c.score < 75 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Adaptive Enhancement Strategy</div>
              {conditions.map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 4, background: '#4f46e5', borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: 500 }}>{c.label}</div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{c.enhancement}</div>
                  </div>
                  {enhanced && <CheckCircle size={16} color="#059669" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Module 1 Output</div>
            <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12 }}>
{JSON.stringify({
  quality_score_before: result.quality_score_before,
  brightness: result.brightness,
  blur: result.blur,
  contrast: result.contrast,
  noise: result.noise,
  shadow_coverage: result.shadow_coverage,
  enhancements_applied: result.enhancements_applied,
  quality_score_after: result.quality_score_after,
  improvement: result.improvement,
}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!analyzed && (
        <div className="glass-card" style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Zap size={40} color="#4f46e5" />
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Upload an image and click Analyze</div>
          <div style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>The system will assess image quality and recommend enhancements automatically.</div>
        </div>
      )}
    </div>
  );
}
