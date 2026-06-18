import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, AlertCircle, Loader } from 'lucide-react';
import { GlassCard, PageHeader, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import { detectFrames, getPipelineResult } from '../api/client';

const signalColor = { green: '#059669', yellow: '#d97706', red: '#dc2626', unknown: '#94a3b8' };
const statusFromSignal = (signal, idx, total, hasViolation) => {
  if (hasViolation && idx === total - 1) return 'confirmed';
  if (hasViolation && idx >= total - 2) return 'violation';
  if (signal === 'yellow') return 'warning';
  if (signal === 'red' && idx > 0) return 'warning';
  return 'normal';
};

function LiveFrame({ frame, annotatedImage }) {
  if (annotatedImage && frame.isLast) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <img src={annotatedImage} alt="Frame" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc' }} />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', borderRadius: 14, position: 'relative', overflow: 'hidden',
      background: '#f8fafc', border: '1px solid #e2e8f0',
    }}>
      <div style={{ position: 'absolute', top: '5%', right: '8%', background: '#fff', borderRadius: 10, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #e2e8f0' }}>
        {['red', 'yellow', 'green'].map((c) => (
          <div key={c} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: frame.signal === c ? signalColor[c] : '#f1f5f9',
            boxShadow: frame.signal === c ? `0 0 8px ${signalColor[c]}60` : 'none',
          }} />
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, fontFamily: 'monospace', color: '#64748b', background: '#fff', padding: '4px 8px', borderRadius: 6 }}>
        Frame {frame.id} | Signal: {frame.signal?.toUpperCase()}
      </div>
      {(frame.status === 'violation' || frame.status === 'confirmed') && (
        <div style={{ position: 'absolute', top: 12, left: 12, background: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>
          <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
          {frame.status === 'confirmed' ? 'VIOLATION CONFIRMED' : 'VIOLATION DETECTED'}
        </div>
      )}
    </div>
  );
}

export default function Replay() {
  const [frames, setFrames] = useState([]);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [meta, setMeta] = useState({ vehicle: '—', violation: null });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const cached = getPipelineResult();
    if (cached?.video_mode && cached?.frame_results?.length) {
      loadFromPipeline(cached);
    }
  }, []);

  const loadFromPipeline = (data) => {
    const results = data.frame_results || [data];
    const built = results.map((r, i) => {
      const signal = r.module2_detection?.traffic_signals?.signal_state || 'unknown';
      const violations = r.module3_violation?.violations || [];
      return {
        id: i + 1,
        time: `00:00:0${i}`,
        signal,
        label: `Frame ${i + 1} — Signal ${signal.toUpperCase()}`,
        annotation: violations[0]?.evidence_detail || r.module2_detection?.explanation?.[0] || 'Processing frame',
        status: statusFromSignal(signal, i, results.length, violations.length > 0),
        isLast: i === results.length - 1,
      };
    });
    setFrames(built);
    setAnnotatedImage(data.module2_detection?.annotated_image || results.at(-1)?.module2_detection?.annotated_image);
    setMeta({
      vehicle: data.module4_lpr?.fused_plate || 'UNKNOWN',
      violation: data.module3_violation?.violations?.[0]?.type,
    });
    setCurrentFrame(0);
  };

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await detectFrames(files);
      const signals = data.frame_signals || [{ frame: 1, state: data.traffic_signals?.signal_state, confidence: 0 }];
      const hasViolation = (data.violation_candidates || []).length > 0;
      const built = signals.map((s, i) => ({
        id: s.frame || i + 1,
        time: `00:00:0${i}`,
        signal: s.state || 'unknown',
        label: `Frame ${s.frame || i + 1} — Signal ${(s.state || 'unknown').toUpperCase()}`,
        annotation: data.explanation?.[i] || data.explanation?.[0] || 'AI scene analysis',
        status: statusFromSignal(s.state, i, signals.length, hasViolation),
        isLast: i === signals.length - 1,
      }));
      setFrames(built.length ? built : [{ id: 1, time: '00:00:00', signal: 'unknown', label: 'Single frame', annotation: 'No temporal data', status: 'normal', isLast: true }]);
      setAnnotatedImage(data.annotated_image);
      setMeta({
        vehicle: data.structured_scene?.[0]?.vehicle_id || '—',
        violation: data.violation_candidates?.[0]?.candidate,
      });
      setCurrentFrame(0);
    } catch (e) {
      setError(e.response?.data?.detail || 'Frame analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playing && frames.length) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((f) => {
          if (f >= frames.length - 1) { setPlaying(false); return f; }
          return f + 1;
        });
      }, 1500);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, frames.length]);

  const frame = frames[currentFrame];

  return (
    <div className="page-enter">
      <PageHeader
        title="Violation Replay"
        subtitle="Live multi-frame analysis with traffic signal timeline"
        badge={<LiveBadge label={loading ? 'ANALYZING' : frames.length ? 'LIVE' : 'READY'} />}
        actions={
          <label className="btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Upload Frames
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files)} />
          </label>
        }
      />

      {error && <div className="glass-card" style={{ padding: 12, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{error}</div>}
      {loading && <div className="glass-card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 8, color: '#4f46e5' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing frames...</div>}

      {!frames.length && !loading ? (
        <GlassCard style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Upload multiple frames or run video pipeline first</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Use Pipeline with a video file, then return here — or upload 2–8 images for temporal signal replay</div>
        </GlassCard>
      ) : frame && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div>
            <LiveFrame frame={frame} annotatedImage={annotatedImage} />
            <GlassCard style={{ padding: 18, marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {frames.map((f, i) => (
                  <div key={i} onClick={() => { setPlaying(false); setCurrentFrame(i); }}
                    style={{ flex: 1, height: 8, borderRadius: 4, cursor: 'pointer', background: i <= currentFrame ? '#4f46e5' : '#e2e8f0' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button className="btn-ghost" onClick={() => { setPlaying(false); setCurrentFrame(0); }}><SkipBack size={15} /></button>
                <button className="btn-ghost" onClick={() => { setPlaying(false); setCurrentFrame((f) => Math.max(0, f - 1)); }}>‹ Prev</button>
                <button onClick={() => setPlaying((p) => !p)} className="btn-primary" style={{ padding: '10px 24px' }}>
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button className="btn-ghost" onClick={() => { setPlaying(false); setCurrentFrame((f) => Math.min(frames.length - 1, f + 1)); }}>Next ›</button>
                <button className="btn-ghost" onClick={() => { setPlaying(false); setCurrentFrame(frames.length - 1); }}><SkipForward size={15} /></button>
              </div>
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>CURRENT FRAME</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{frame.label}</div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>{frame.annotation}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: signalColor[frame.signal] || '#94a3b8' }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>SIGNAL: {frame.signal?.toUpperCase()}</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 14 }}>AI ANALYSIS</div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>Vehicle: <strong>{meta.vehicle}</strong></div>
              {meta.violation && <div style={{ fontSize: 12, marginBottom: 8 }}>Violation: <SeverityBadge severity="high" /> {meta.violation.replace(/_/g, ' ')}</div>}
              <div style={{ fontSize: 12 }}>Status: <strong>{frame.status}</strong></div>
            </GlassCard>

            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 10 }}>FRAME PROGRESSION</div>
              {frames.map((f, i) => (
                <div key={i} onClick={() => { setPlaying(false); setCurrentFrame(i); }}
                  style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: i === currentFrame ? '#eef2ff' : 'transparent' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: signalColor[f.signal] || '#cbd5e1', marginTop: 4 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: i === currentFrame ? 600 : 400 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{f.time}</span>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
