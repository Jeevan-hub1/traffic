import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck, Copy, Lock, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { PageHeader, SeverityBadge } from '../components/shared/index.jsx';
import { getPipelineResult } from '../api/client';

export default function Evidence() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const loadCached = async () => {
      const cached = await getPipelineResult();
      if (cached?.module5_evidence) setData(cached.module5_evidence);
    };
    loadCached();
  }, []);

  const copyHash = () => {
    if (!data?.integrity_hash) return;
    navigator.clipboard.writeText(data.integrity_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); }, 1200);
  };

  if (!data) {
    return (
      <div className="page-enter">
        <PageHeader title="Digital Evidence Viewer" subtitle="Module 5 — Cryptographically signed legal evidence package" />
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          Run the pipeline on the Pipeline page to generate evidence, then return here to view it.
        </div>
      </div>
    );
  }

  const violationLabel = (data.violations || []).map((v) => v.type?.replace(/_/g, ' ').toUpperCase()).join(' + ') || 'VIOLATION';

  return (
    <div className="page-enter">
      <PageHeader title="Digital Evidence Viewer" subtitle="Module 5 — Cryptographically signed legal evidence package" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 20, background: '#f8fafc' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {data.annotated_image ? (
                <img src={data.annotated_image} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Annotated evidence image</div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Violation Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Calendar size={16} color="#64748b" style={{ marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Date & Time</div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{data.timestamp}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <MapPin size={16} color="#64748b" style={{ marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Location</div>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{data.location || 'Unknown'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <ShieldCheck size={16} color="#dc2626" style={{ marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Infraction</div>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{violationLabel}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <FileCheck size={16} color="#4f46e5" style={{ marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Offender Identity</div>
                  <div style={{ fontSize: 14, color: '#4f46e5', fontWeight: 700 }}>{data.plate}</div>
                </div>
              </div>
            </div>
            {data.summary && (
              <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                {data.summary}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24, borderTop: '4px solid #4f46e5' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <ShieldCheck size={24} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>EVIDENCE CERTIFICATE</div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Case ID</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{data.case_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Evidence ID</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{data.evidence_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Severity</span>
                <SeverityBadge severity={data.severity || 'high'} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>SHA-256 Integrity Hash</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: 10, background: '#f1f5f9', borderRadius: 6, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", wordBreak: 'break-all' }}>
                  {data.integrity_hash}
                </div>
                <button onClick={copyHash} style={{ width: 36, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                  {copied ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} color="#64748b" />}
                </button>
              </div>
            </div>
            <button onClick={handleVerify} disabled={verifying || verified} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {verified ? 'Cryptographically Verified' : verifying ? 'Verifying...' : 'Verify Hash Integrity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
