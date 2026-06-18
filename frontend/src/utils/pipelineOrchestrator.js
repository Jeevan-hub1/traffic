/** Convert base64 data URL to File for API uploads */
export function dataUrlToFile(dataUrl, filename = 'enhanced.jpg') {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export const STAGE_DEFINITIONS = [
  {
    id: 1,
    key: 'module1_quality',
    icon: 'Eye',
    label: 'Vision Quality Analyzer',
    module: 'Module 1',
    color: '#4f46e5',
    input: 'Raw traffic surveillance image',
    processing: ['Brightness Analysis', 'Blur Detection', 'Contrast Assessment', 'Noise Estimation', 'Shadow Coverage', 'Adaptive Enhancement'],
    metrics: (d, lat) => [
      { label: 'Score Before', value: d?.quality_score_before ?? '—' },
      { label: 'Score After', value: d?.quality_score_after ?? '—' },
      { label: 'Improvement', value: d?.improvement != null ? `+${d.improvement}` : '—' },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      qualityBefore: d.quality_score_before,
      qualityAfter: d.quality_score_after,
      brightness: d.brightness,
      blur: d.blur,
      enhancements: d.enhancements_applied,
    } : null,
    image: (d) => d?.enhanced_image,
  },
  {
    id: 2,
    key: 'module2_detection',
    icon: 'Cpu',
    label: 'Road User Detection',
    module: 'Module 2',
    color: '#7c3aed',
    input: 'Enhanced image from Module 1',
    processing: ['YOLOv11 Multi-Class Detection', 'ByteTrack Vehicle Tracking', 'Traffic Signal R/Y/G', 'Scene Graph Generation', 'Violation Candidates'],
    metrics: (d, lat) => [
      { label: 'Vehicles', value: d?.summary?.vehicles_detected ?? '—' },
      { label: 'Persons', value: d?.summary?.persons_detected ?? '—' },
      { label: 'Signal', value: (d?.summary?.signal_state || d?.traffic_signals?.signal_state || '—').toString().toUpperCase() },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      vehicles: d.summary?.vehicles_detected,
      persons: d.summary?.persons_detected,
      signal: d.traffic_signals?.signal_state || d.summary?.signal_state,
      candidates: d.violation_candidates?.map((c) => c.candidate),
      trackingIds: d.summary?.tracking_ids,
    } : null,
    image: (d) => d?.annotated_image,
  },
  {
    id: 3,
    key: 'module3_violation',
    icon: 'AlertTriangle',
    label: 'Violation Verification',
    module: 'Module 3',
    color: '#d97706',
    input: 'Structured traffic scene with candidates',
    processing: ['Hierarchical Rule Verification', 'Temporal Evidence Analysis', 'Signal Context Validation', 'Confidence Fusion', 'Threat Scoring'],
    metrics: (d, lat) => [
      { label: 'Violations', value: d?.violations?.length ?? 0 },
      { label: 'Threat Score', value: d?.threat_score ?? '—' },
      { label: 'Verified', value: d?.verified ? 'Yes' : 'No' },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      violations: d.violations?.map((v) => v.type),
      threatScore: d.threat_score,
      severity: d.violations?.map((v) => v.severity),
      composite: d.composite,
    } : null,
  },
  {
    id: 4,
    key: 'module4_lpr',
    icon: 'CreditCard',
    label: 'License Plate Recognition',
    module: 'Module 4',
    color: '#059669',
    input: 'Verified violation scene image',
    processing: ['Plate Detection', 'Quality Assessment', 'OCR Fusion', 'Trust Score', 'VAHAN Lookup'],
    metrics: (d, lat) => [
      { label: 'OCR Confidence', value: d?.ocr_confidence ?? '—' },
      { label: 'Trust Score', value: d?.trust_score ?? '—' },
      { label: 'Plate', value: d?.fused_plate ?? 'N/A' },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      plate: d.fused_plate,
      trustScore: d.trust_score,
      vahan: d.vahan?.found ? 'Match found' : 'No record',
      tampering: d.tampering?.tampered ? 'Suspicious' : 'Clear',
    } : null,
  },
  {
    id: 5,
    key: 'module5_evidence',
    icon: 'FileText',
    label: 'Evidence Generation',
    module: 'Module 5',
    color: '#db2777',
    input: 'Verified violation + plate identity',
    processing: ['Evidence Package Assembly', 'Annotated Image', 'Timeline', 'SHA-256 Hash', 'Legal Documentation'],
    metrics: (d, lat) => [
      { label: 'Case ID', value: d?.case_id?.slice(-8) ?? '—' },
      { label: 'Severity', value: d?.severity ?? '—' },
      { label: 'Status', value: d?.status ?? '—' },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      caseId: d.case_id,
      evidenceId: d.evidence_id,
      hash: d.integrity_hash?.slice(0, 20) + '...',
      status: d.status,
    } : null,
    image: (d) => d?.annotated_image,
  },
  {
    id: 6,
    key: 'module6_analytics',
    icon: 'BarChart3',
    label: 'Analytics & Reporting',
    module: 'Module 6',
    color: '#0891b2',
    input: 'Evidence packages and violation records',
    processing: ['Trend Analysis', 'Junction Safety Scoring', 'Repeat Offender Detection', 'Hotspot Identification'],
    metrics: (d) => [
      { label: 'Total Violations', value: d?.total_violations ?? '—' },
      { label: 'Repeat Offenders', value: d?.repeat_offender_count ?? '—' },
      { label: 'Types Tracked', value: d?.violation_types?.length ?? '—' },
      { label: 'Avg Verify (ms)', value: d?.avg_verification_ms ?? '—' },
    ],
    output: (d) => d ? {
      totalViolations: d.total_violations,
      repeatOffenders: d.repeat_offender_count,
      topTypes: d.violation_types?.slice(0, 3).map((t) => t.name),
    } : null,
  },
  {
    id: 7,
    key: 'module7_evaluation',
    icon: 'Gauge',
    label: 'Performance Evaluation',
    module: 'Module 7',
    color: '#ea580c',
    input: 'Complete pipeline execution data',
    processing: ['Detection Metrics', 'OCR Assessment', 'Latency Benchmark', 'System Health Score'],
    metrics: (d, lat) => [
      { label: 'mAP@50', value: d?.detection?.mAP50 ?? '—' },
      { label: 'OCR Accuracy', value: d?.ocr?.plate_accuracy ?? '—' },
      { label: 'End-to-End', value: d?.end_to_end_success_rate ?? '—' },
      { label: 'Pipeline (ms)', value: lat ?? '—' },
    ],
    output: (d) => d ? {
      accuracy: d.detection?.accuracy,
      ocrAccuracy: d.ocr?.plate_accuracy,
      fps: d.throughput?.fps,
      systemHealth: d.end_to_end_success_rate,
    } : null,
  },
];

export async function runPipelineStages(file, api, onProgress) {
  const latencies = {};
  const t0 = performance.now();

  onProgress({ stage: 1, status: 'running' });
  const t1 = performance.now();
  const m1 = await api.analyzeQuality(file);
  latencies.quality = Math.round(performance.now() - t1);
  onProgress({ stage: 1, status: 'done', data: m1, latencies });

  const enhancedFile = m1.enhanced_image ? dataUrlToFile(m1.enhanced_image) : file;

  onProgress({ stage: 2, status: 'running' });
  const t2 = performance.now();
  const m2 = await api.detectObjects(enhancedFile);
  latencies.detection = Math.round(performance.now() - t2);
  onProgress({ stage: 2, status: 'done', data: m2, latencies });

  onProgress({ stage: 3, status: 'running' });
  const t3 = performance.now();
  const m3 = await api.verifyViolations({
    violation_candidates: m2.violation_candidates || [],
    structured_scene: m2.structured_scene || [],
    frames_analyzed: 1,
    road_context: m2.scene?.road_context,
  });
  latencies.verification = Math.round(performance.now() - t3);
  onProgress({ stage: 3, status: 'done', data: m3, latencies });

  onProgress({ stage: 4, status: 'running' });
  const t4 = performance.now();
  const m4 = await api.recognizePlate(enhancedFile);
  latencies.lpr = Math.round(performance.now() - t4);
  onProgress({ stage: 4, status: 'done', data: m4, latencies });

  let m5 = null;
  if (m3.verified) {
    onProgress({ stage: 5, status: 'running' });
    const t5 = performance.now();
    m5 = await api.generateEvidence({
      plate: m4.fused_plate || 'UNKNOWN',
      image_base64: m2.annotated_image || m1.enhanced_image,
      violations: m3.violations,
      metadata: {
        threat_score: m3.threat_score,
        trust_score: m4.trust_score,
        signal_state: m2.scene?.road_context?.signal_state,
      },
      timeline: m3.timeline,
    });
    latencies.evidence = Math.round(performance.now() - t5);
    onProgress({ stage: 5, status: 'done', data: m5, latencies });
  } else {
    onProgress({ stage: 5, status: 'skipped', data: null, latencies });
  }

  onProgress({ stage: 6, status: 'running' });
  const m6 = await api.getAnalyticsSummary();
  onProgress({ stage: 6, status: 'done', data: m6, latencies });

  onProgress({ stage: 7, status: 'running' });
  const m7 = await api.getEvaluationMetrics();
  latencies.total = Math.round(performance.now() - t0);
  onProgress({ stage: 7, status: 'done', data: m7, latencies });

  const result = {
    pipeline_status: 'complete',
    latency_ms: latencies,
    module1_quality: m1,
    module2_detection: m2,
    module3_violation: m3,
    module4_lpr: m4,
    module5_evidence: m5,
    module6_analytics: m6,
    module7_evaluation: m7,
    enhanced_image: m1.enhanced_image,
    timeline: buildTimeline(m1, m2, m3, m4, m5, latencies),
  };

  api.savePipelineResult(result);
  return result;
}

function buildTimeline(m1, m2, m3, m4, m5, lat) {
  const items = [
    { time: 'T+0ms', event: 'Image received' },
    { time: `T+${lat.quality || 0}ms`, event: `Quality ${m1.quality_score_before} → ${m1.quality_score_after}` },
    { time: `T+${(lat.quality || 0) + (lat.detection || 0)}ms`, event: `Signal ${(m2.traffic_signals?.signal_state || 'unknown').toUpperCase()} | ${m2.summary?.vehicles_detected} vehicles` },
  ];
  if (m3.verified) {
    items.push({ time: `T+${(lat.quality || 0) + (lat.detection || 0) + (lat.verification || 0)}ms`, event: `${m3.violations.length} violation(s) confirmed` });
  }
  if (m4.fused_plate) {
    items.push({ time: `T+${(lat.quality || 0) + (lat.detection || 0) + (lat.verification || 0) + (lat.lpr || 0)}ms`, event: `Plate ${m4.fused_plate} (${m4.trust_score}% trust)` });
  }
  if (m5) {
    items.push({ time: `T+${lat.total || 0}ms`, event: `Evidence sealed — ${m5.case_id}` });
  }
  return items;
}
