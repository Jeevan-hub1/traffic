import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background, addEdge, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Upload, AlertCircle, Loader } from 'lucide-react';
import { PageHeader, GlassCard, LiveBadge } from '../components/shared/index.jsx';
import { CheckCircle, XCircle } from 'lucide-react';
import { detectObjects, detectFrames, getPipelineResult } from '../api/client';
import { sceneGraphToFlow, detectionBoxesFromScene } from '../utils/sceneGraph';

export default function Detection() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [image, setImage] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const cached = getPipelineResult();
    if (cached?.module2_detection) {
      applyResult(cached.module2_detection);
    }
  }, []);

  const applyResult = (data) => {
    setResult(data);
    const flow = sceneGraphToFlow(data.scene_graph, data.violation_candidates);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    if (data.annotated_image) setImage(data.annotated_image);
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  const runDetection = async (useMulti = false) => {
    if (!files.length) {
      setError('Upload at least one traffic image.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = useMulti && files.length > 1
        ? await detectFrames(files)
        : await detectObjects(files[0]);
      applyResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Detection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles(selected);
    setImage(URL.createObjectURL(selected[0]));
    setResult(null);
    setError(null);
  };

  const boxes = result ? detectionBoxesFromScene(result.scene, result.objects) : [];
  const scene = result?.scene;
  const candidates = result?.violation_candidates || [];

  return (
    <div className="page-enter">
      <PageHeader
        title="Scene Detection & Understanding"
        subtitle="Module 2 — YOLOv11 detection, ByteTrack-style tracking, scene graph & violation candidates"
        badge={<LiveBadge label={loading ? 'DETECTING' : result ? 'LIVE' : 'READY'} />}
        actions={
          <label className="btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Upload
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFile} />
          </label>
        }
      />

      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-primary" onClick={() => runDetection(false)} disabled={loading || !files.length}>
          {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {loading ? 'Processing...' : 'Run Detection'}
        </button>
        {files.length > 1 && (
          <button className="btn-ghost" onClick={() => runDetection(true)} disabled={loading}>
            Multi-Frame Track ({files.length} frames)
          </button>
        )}
        {error && <span style={{ fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} />{error}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 20 }}>
        <div className="glass-card" style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Vision Scene Graph</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{result ? 'Generated from live detection' : 'Upload an image to build scene graph'}</div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {nodes.length ? (
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView attributionPosition="bottom-left">
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              </ReactFlow>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 14 }}>No scene graph yet</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {image && (
            <div className="glass-card" style={{ padding: 12 }}>
              <img src={image} alt="Detection" style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'contain' }} />
            </div>
          )}

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Detected Objects</div>
            {boxes.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {boxes.map((d, i) => (
                  <div key={i} className="glass-card" style={{ padding: 14, borderColor: `${d.color}40`, background: `${d.color}05` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{d.label}</span>
                      {d.missing ? <XCircle size={14} color="#dc2626" /> : <CheckCircle size={14} color="#059669" />}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 500 }}>{d.type.toUpperCase()}</div>
                    <div style={{ height: 6, background: '#ffffff', borderRadius: 3, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                      <div style={{ height: '100%', width: `${d.confidence}%`, background: d.color, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 6, fontWeight: 600 }}>{d.confidence}% confidence</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Run detection to see objects</div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Scene Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Vehicles', value: result?.summary?.vehicles_detected ?? '—', color: '#4f46e5', bg: '#eef2ff' },
                { label: 'Persons', value: result?.summary?.persons_detected ?? '—', color: '#059669', bg: '#ecfdf5' },
                { label: 'Tracking IDs', value: result?.summary?.tracking_ids?.length ?? '—', color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'Candidates', value: result?.summary?.candidates_count ?? '—', color: '#dc2626', bg: '#fef2f2' },
                { label: 'Stop Line', value: scene?.road_context?.stop_line_detected ? 'Detected' : 'N/A', color: '#059669', bg: '#ecfdf5' },
                { label: 'Signal State', value: (result?.traffic_signals?.signal_state || result?.summary?.signal_state || '—').toString().toUpperCase(), color: result?.traffic_signals?.signal_state === 'red' ? '#dc2626' : result?.traffic_signals?.signal_state === 'green' ? '#059669' : '#d97706', bg: '#fffbeb' },
              ].map((item) => (
                <div key={item.label} className="glass-card" style={{ padding: 12, background: item.bg, border: `1px solid ${item.color}30` }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: item.color, fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {candidates.length > 0 && (
            <div className="glass-card" style={{ padding: 20, border: '2px solid #fecaca', background: '#fef2f2' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 800, color: '#dc2626', marginBottom: 12 }}>Violation Candidates</div>
              {candidates.map((v) => (
                <div key={v.candidate + v.vehicle_id} style={{ padding: 10, marginBottom: 8, background: '#ffffff', border: '1px solid #fca5a5', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>
                      ⚠️ {v.candidate.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{v.confidence}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{v.reason}</div>
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
