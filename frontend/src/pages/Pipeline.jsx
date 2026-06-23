import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Upload, Play, CheckCircle, Loader, Eye, Cpu,
  AlertTriangle, CreditCard, FileText, BarChart3, Gauge, ArrowRight, ExternalLink,
} from 'lucide-react';
import { PageHeader, GlassCard, QualityGauge, ThreatMeter, SeverityBadge, LiveBadge } from '../components/shared/index.jsx';
import {
  analyzeQuality, detectObjects, verifyViolations, recognizePlate, generateEvidence,
  getAnalyticsSummary, getEvaluationMetrics, savePipelineResult, getPipelineResult,
  processPipeline,
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
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Load cached pipeline result on mount
  useEffect(() => {
    const loadCached = async () => {
      const cached = await getPipelineResult();
      setResult(cached);
    };
    loadCached();
  }, []);

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

  const isVideoFile = (file) => file?.type?.startsWith('video/') || /\.(mp4|avi|mov|mkv|webm|flv|wmv)$/i.test(file?.name);

  const runPipeline = async () => {
    if (!file) { setError('Upload an image or video first.'); return; }
    setRunning(true);
    setError(null);
    setCompletedStages([]);
    setStageData({});
    setResult(null);
    setLatencies({});
    try {
      let data;
      if (isVideoFile(file)) {
        data = await processPipeline(file);
        // For video mode, extract module data from result
        const moduleData = {};
        STAGE_DEFINITIONS.forEach(def => {
          if (data[def.key]) {
            moduleData[def.key] = data[def.key];
          }
        });
        setStageData(moduleData);
        
        // Set processing time
        if (data.processing_time_sec) {
          setLatencies({ total: Math.round(data.processing_time_sec * 1000) });
        }
      } else {
        data = await runPipelineStages(file, api, onProgress);
      }
      setResult(data);
      setCompletedStages(STAGE_DEFINITIONS.map((s) => s.id));
      if (data.module2_detection?.annotated_image) setPreview(data.module2_detection.annotated_image);
      else if (data.sample_annotated_frame) setPreview(data.sample_annotated_frame);
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
            <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>
              Pipeline Complete — {result.video_mode || result.annotated_video ? `${result.total_frames || 0} frames processed in ${(result.processing_time_sec || 0).toFixed(2)}s` : `${latencies.total || result.latency_ms?.total}ms total`}
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              {result.video_mode || result.annotated_video
                ? `${result.module3_violation?.total_violations_detected || 0} violation(s) • ${result.module4_lpr?.total_plates_detected || 0} plate(s) detected`
                : (m3?.verified ? `${m3.violations.length} violation(s) verified` : 'No violations detected')
              }
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
              {/* Video Mode - Show annotated video and analytics */}
              {result.video_mode || result.annotated_video ? (
                <>
                  {/* Video Player */}
                  {result.annotated_video && (
                    <GlassCard style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Annotated Video Output</div>
                      <video
                        controls
                        style={{ width: '100%', borderRadius: 10, maxHeight: 400, backgroundColor: '#f8fafc' }}
                        src={`data:video/mp4;base64,${result.annotated_video}`}
                      />
                    </GlassCard>
                  )}

                  {/* Video Analytics Overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                    <GlassCard style={{ padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>TOTAL FRAMES</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5' }}>
                        {result.total_frames || 0}
                      </div>
                    </GlassCard>
                    <GlassCard style={{ padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>PROCESSING TIME</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>
                        {(result.processing_time_sec || 0).toFixed(2)}s
                      </div>
                    </GlassCard>
                    <GlassCard style={{ padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>VIOLATIONS FOUND</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>
                        {result.module3_violation?.total_violations_detected || 0}
                      </div>
                    </GlassCard>
                    <GlassCard style={{ padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>PLATES DETECTED</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>
                        {result.module4_lpr?.total_plates_detected || 0}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Module 1: Quality */}
                  {result.module1_quality && (
                    <GlassCard style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Quality Enhancement (Module 1)</div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Before Enhancement</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#475569' }}>
                                {result.module1_quality.average_score_before?.toFixed(1) || 0}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>After Enhancement</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>
                                {result.module1_quality.average_score_after?.toFixed(1) || 0}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Improvement: {(result.module1_quality.average_score_after - result.module1_quality.average_score_before).toFixed(1)} points
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Module 2: Detection */}
                  {result.module2_detection && (
                    <GlassCard style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Detection & Tracking (Module 2)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>Frames Analyzed</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                            {result.module2_detection.total_frames_analyzed}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>Original FPS</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                            {result.original_fps?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      {result.module2_detection.frame_by_frame_summary?.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Sample Frame Statistics:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {result.module2_detection.frame_by_frame_summary.slice(0, 6).map((f, i) => (
                              <div key={i} style={{ padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 10 }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>Frame {f.frame_idx}</div>
                                <div style={{ color: '#64748b' }}>
                                  Vehicles: {f.vehicles_detected}
                                </div>
                                <div style={{ color: '#64748b' }}>
                                  Violations: {f.violations_detected}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  )}

                  {/* Module 3: Violations */}
                  {result.module3_violation && (
                    <GlassCard style={{ padding: 16, border: result.module3_violation.total_violations_detected > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, marginBottom: 12, color: result.module3_violation.total_violations_detected > 0 ? '#dc2626' : '#334155' }}>
                        Violation Detection (Module 3)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Total Violations</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>
                            {result.module3_violation.total_violations_detected || 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>High Confidence</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c' }}>
                            {result.module3_violation.high_confidence_violations?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Violation Types</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5' }}>
                            {Object.keys(result.module3_violation.violations_by_type || {}).length || 0}
                          </div>
                        </div>
                      </div>
                      {Object.entries(result.module3_violation.violations_by_type || {}).length > 0 && (
                        <div style={{ paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Violations by Type:</div>
                          {Object.entries(result.module3_violation.violations_by_type).map(([type, count]) => (
                            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, fontSize: 11, marginBottom: 4, background: '#f8fafc', borderRadius: 6 }}>
                              <span style={{ color: '#475569', textTransform: 'capitalize' }}>{type?.replace(/_/g, ' ')}</span>
                              <span style={{ fontWeight: 700, color: '#dc2626' }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  )}

                  {/* Module 4: License Plates */}
                  {result.module4_lpr && result.module4_lpr.plates_found?.length > 0 && (
                    <GlassCard style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>License Plates Detected (Module 4)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        {result.module4_lpr.plates_found.slice(0, 6).map((plate, i) => {
                          // Ensure values are in 0-100 range; don't multiply if already percentage
                          const confidence = plate.confidence > 1 ? plate.confidence : plate.confidence * 100;
                          const trustScore = plate.trust_score > 1 ? plate.trust_score : plate.trust_score * 100;
                          
                          return (
                            <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>
                                {plate.plate || 'N/A'}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                Confidence: {Math.min(100, confidence).toFixed(0)}%
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                Trust: {Math.min(100, trustScore).toFixed(0)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  )}

                  {/* Module 6: Analytics */}
                  {result.module6_analytics && (
                    <GlassCard style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Analytics & Insights (Module 6)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Total Vehicles Tracked</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>
                            {result.module6_analytics.total_vehicles_tracked || 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Repeat Offenders</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
                            {result.module6_analytics.repeat_offenders?.length || 0}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Processing Performance */}
                  <GlassCard style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Processing Performance</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>Total Time</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>
                          {(result.processing_time_sec || 0).toFixed(2)}s
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>Avg per Frame</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5' }}>
                          {((result.processing_time_sec || 0) * 1000 / (result.total_frames || 1)).toFixed(1)}ms
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>FPS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>
                          {((result.total_frames || 0) / (result.processing_time_sec || 1)).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </>
              ) : (
                /* Image Mode - Original behavior */
                <>
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
                </>
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
