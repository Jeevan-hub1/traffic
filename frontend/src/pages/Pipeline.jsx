import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Upload, Play, CheckCircle, Loader, Eye, Cpu,
  AlertTriangle, CreditCard, FileText, BarChart3, Gauge, ArrowRight, ExternalLink,
} from 'lucide-react';
import { PageHeader, GlassCard, QualityGauge, ThreatMeter, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import {
  analyzeQuality, detectObjects, verifyViolations, recognizePlate, generateEvidence,
  getAnalyticsSummary, getEvaluationMetrics, savePipelineResult, getPipelineResult,
} from '../api/client';
import { STAGE_DEFINITIONS, runPipelineStages } from '../utils/pipelineOrchestrator';

const ICONS = { Eye, Cpu, AlertTriangle, CreditCard, FileText, BarChart3, Gauge };

const api = {
  analyzeQuality, detectObjects, verifyViolations, recognizePlate, generateEvidence,
  getAnalyticsSummary, getEvaluationMetrics, savePipelineResult,
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [activeStageId, setActiveStageId] = useState(null);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState([]);
  const [stageData, setStageData] = useState({});
  const [latencies, setLatencies] = useState({});
  const [result, setResult] = useState(() => getPipelineResult());
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const activeDef = STAGE_DEFINITIONS.find((s) => s.id === activeStageId);
  const activeModuleData = activeDef ? stageData[activeDef.key] ?? result?.[activeDef.key] : null;

  const onProgress = useCallback(({ stage, status, data, latencies: lat }) => {
    setCurrentStage(status === 'running' ? stage : 0);
    if (lat) setLatencies(lat);
    if (status === 'done' || status === 'skipped') {
      setCompletedStages((prev) => [...new Set([...prev, stage])]);
      const def = STAGE_DEFINITIONS.find((s) => s.id === stage);
      if (def && data) setStageData((prev) => ({ ...prev, [def.key]: data }));
    }
  }, []);

  const runPipeline = async () => {
    if (!file) { setError('Upload an image or video first.'); return; }
    setRunning(true);
    setError(null);
    setCompletedStages([]);
    setStageData({});
    setResult(null);
    setLatencies({});
    try {
      const data = await runPipelineStages(file, api, onProgress);
      setResult(data);
      setCompletedStages(STAGE_DEFINITIONS.map((s) => s.id));
      if (data.module2_detection?.annotated_image) setPreview(data.module2_detection.annotated_image);
      else if (data.enhanced_image) setPreview(data.enhanced_image);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Pipeline failed. Is the backend running on port 8000?');
    } finally {
      setRunning(false);
      setCurrentStage(0);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStageData({});
    setCompletedStages([]);
    setError(null);
  };

  const displayImage = useMemo(() => {
    if (activeDef?.image) {
      const img = activeDef.image(activeModuleData);
      if (img) return img;
    }
    return preview;
  }, [activeDef, activeModuleData, preview]);

  const m3 = result?.module3_violation;
  const m5 = result?.module5_evidence;

  return (
    <div className="page-enter">
      <PageHeader
        title="AI Pipeline Visualizer"
        subtitle="Live 7-stage traffic violation processing workflow"
        badge={<LiveBadge label={running ? 'PROCESSING' : result ? 'COMPLETE' : 'READY'} />}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn-ghost" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload Image/Video
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
            </label>
            <button className="btn-primary" onClick={runPipeline} disabled={running || !file}>
              {running ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              {running ? `Stage ${currentStage}/7...` : 'Run Pipeline'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 16, color: '#dc2626', fontSize: 13, border: '1px solid #fecaca' }}>{error}</div>
      )}

      {/* Summary bar when complete */}
      {result && !running && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, background: 'linear-gradient(135deg, #ecfdf5, #eef2ff)' }}>
          <CheckCircle size={28} color="#059669" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>Pipeline Complete — {latencies.total || result.latency_ms?.total}ms total</div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              {m3?.verified ? `${m3.violations.length} violation(s) verified` : 'No violations detected'}
              {result.module4_lpr?.fused_plate && ` • Plate ${result.module4_lpr.fused_plate}`}
            </div>
          </div>
          {m5 && (
            <button className="btn-primary" onClick={() => navigate('/evidence')}>
              <ExternalLink size={14} /> View Evidence
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Stage list */}
        <div>
          <div className="glass-card" style={{ padding: 12, marginBottom: 12 }}>
            {displayImage ? (
              <img src={displayImage} alt="Pipeline" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #c7d2fe', borderRadius: 8 }}>
                <Upload size={20} color="#94a3b8" />
              </div>
            )}
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
              {file?.name || 'No file selected'}
            </div>
          </div>

          {STAGE_DEFINITIONS.map((s, idx) => {
            const Icon = ICONS[s.icon];
            const isDone = completedStages.includes(s.id);
            const isRunning = currentStage === s.id;
            const isActive = activeStageId === s.id;
            return (
              <div key={s.id}>
                <button
                  onClick={() => setActiveStageId(isActive ? null : s.id)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
                    border: `1px solid ${isActive ? s.color + '60' : isDone ? s.color + '30' : '#e8edf5'}`,
                    background: isActive ? s.color + '10' : isDone ? s.color + '06' : '#fff',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isDone ? s.color + '18' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDone ? <CheckCircle size={14} color={s.color} /> : isRunning ? <Loader size={14} color={s.color} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={14} color="#94a3b8" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: s.color, fontWeight: 800, letterSpacing: '0.06em' }}>{s.module}</div>
                    <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{s.label}</div>
                    {(() => {
                      const latKey = { 1: 'quality', 2: 'detection', 3: 'verification', 4: 'lpr', 5: 'evidence' }[s.id];
                      return latKey && latencies[latKey] && isDone ? (
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{latencies[latKey]}ms</div>
                      ) : null;
                    })()}
                  </div>
                  {isActive ? <ChevronDown size={12} /> : <ChevronRight size={12} color="#94a3b8" />}
                </button>
                {idx < STAGE_DEFINITIONS.length - 1 && (
                  <div style={{ width: 2, height: 8, marginLeft: 26, background: isDone ? s.color + '50' : '#e2e8f0' }} />
                )}
              </div>
            );
          })}

          <div className="glass-card" style={{ padding: 10, marginTop: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: completedStages.length === 7 ? '#059669' : '#94a3b8' }}>
              {completedStages.length === 7 ? '✓ Evidence Package Ready' : `${completedStages.length}/7 stages`}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {activeDef ? (
            <div className="page-enter">
              <div className="gradient-border" style={{ padding: 22, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  {React.createElement(ICONS[activeDef.icon], { size: 22, color: activeDef.color })}
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800 }}>{activeDef.label}</div>
                    <div style={{ fontSize: 12, color: activeDef.color, fontWeight: 700 }}>{activeDef.module}</div>
                  </div>
                </div>

                {activeDef.image?.(activeModuleData) && (
                  <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={activeDef.image(activeModuleData)} alt="Stage output" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#f8fafc' }} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>INPUT</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{activeDef.input}</div>
                  </GlassCard>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>PROCESSING</div>
                    {activeDef.processing.map((p) => (
                      <div key={p} style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 11, color: '#64748b' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: activeDef.color, marginTop: 5 }} />
                        {p}
                      </div>
                    ))}
                  </GlassCard>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>OUTPUT</div>
                    {activeDef.output(activeModuleData) ? (
                      Object.entries(activeDef.output(activeModuleData)).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: '#94a3b8' }}>{k}: </span>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Awaiting stage completion</div>
                    )}
                  </GlassCard>
                </div>
              </div>

              <GlassCard style={{ padding: 18 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 14 }}>PERFORMANCE METRICS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {activeDef.metrics(activeModuleData, { 1: latencies.quality, 2: latencies.detection, 3: latencies.verification, 4: latencies.lpr, 5: latencies.evidence }[activeDef.id]).map((m) => (
                    <div key={m.label} className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: activeDef.color }}>{m.value}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {activeDef.id === 3 && activeModuleData?.violations?.length > 0 && (
                <GlassCard style={{ padding: 18, marginTop: 16, border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 800, marginBottom: 12, color: '#dc2626' }}>Verified Violations</div>
                  {activeModuleData.violations.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#fff', borderRadius: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{v.type.replace(/_/g, ' ')}</span>
                      <SeverityBadge severity={v.severity} />
                    </div>
                  ))}
                  <ThreatMeter score={activeModuleData.threat_score} size={120} />
                </GlassCard>
              )}
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Overview row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <GlassCard style={{ padding: 20, textAlign: 'center' }}>
                  <QualityGauge score={result.module1_quality?.quality_score_after || 0} size={100} label="Image Quality" />
                </GlassCard>
                <GlassCard style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Traffic Signal</div>
                  <div style={{
                    fontSize: 28, fontWeight: 800,
                    color: result.module2_detection?.traffic_signals?.signal_state === 'red' ? '#dc2626'
                      : result.module2_detection?.traffic_signals?.signal_state === 'green' ? '#059669' : '#d97706',
                  }}>
                    {(result.module2_detection?.traffic_signals?.signal_state || 'unknown').toUpperCase()}
                  </div>
                </GlassCard>
                <GlassCard style={{ padding: 20, textAlign: 'center' }}>
                  <ThreatMeter score={result.module3_violation?.threat_score || 0} size={100} />
                </GlassCard>
              </div>

              {result.module2_detection?.annotated_image && (
                <GlassCard style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Annotated Detection Output</div>
                  <img src={result.module2_detection.annotated_image} alt="Annotated" style={{ width: '100%', borderRadius: 10, maxHeight: 360, objectFit: 'contain' }} />
                </GlassCard>
              )}

              <GlassCard style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16 }}>Pipeline Timeline</div>
                {(result.timeline || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', minWidth: 72 }}>{t.time}</span>
                    <ArrowRight size={12} color="#c7d2fe" />
                    <span style={{ fontSize: 13, color: '#334155' }}>{t.event}</span>
                  </div>
                ))}
              </GlassCard>

              {latencies.total && (
                <GlassCard style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Latency Breakdown (ms)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['quality', 'detection', 'verification', 'lpr', 'evidence', 'total'].map((k) => latencies[k] != null && (
                      <div key={k} style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>{k}: </span>
                        <strong>{latencies[k]}ms</strong>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          ) : (
            <GlassCard style={{ padding: 60, textAlign: 'center' }}>
              <Cpu size={32} color="#4f46e5" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{running ? `Processing Stage ${currentStage}...` : 'Select a Stage or Run Pipeline'}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Upload a traffic image and process through all 7 modules live</div>
              {!running && <button className="btn-primary" onClick={runPipeline} disabled={!file}><Play size={14} /> Run Full Pipeline</button>}
            </GlassCard>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
