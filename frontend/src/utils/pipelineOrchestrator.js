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
    metrics: (d, lat) => {
      const before = d?.quality_score_before ?? d?.average_score_before ?? 0;
      const after = d?.quality_score_after ?? d?.average_score_after ?? 0;
      const improvement = after - before;
      return [
        { label: 'Score Before', value: before ? `${before.toFixed(1)}` : '—' },
        { label: 'Score After', value: after ? `${after.toFixed(1)}` : '—' },
        { label: 'Improvement', value: improvement !== 0 ? `+${improvement.toFixed(1)}` : '—' },
        { label: 'Time (ms)', value: lat ?? '—' },
      ];
    },
    output: (d) => {
      if (!d) return null;
      const before = d?.quality_score_before ?? d?.average_score_before ?? 0;
      const after = d?.quality_score_after ?? d?.average_score_after ?? 0;
      return {
        qualityBefore: before ? `${before.toFixed(1)}` : '—',
        qualityAfter: after ? `${after.toFixed(1)}` : '—',
        brightness: d.brightness ?? '—',
        blur: d.blur ?? '—',
        enhancements: d.enhancements_applied ?? d.frame_details?.length ?? '—',
      };
    },
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
    metrics: (d, lat) => {
      // Support both image and video modes
      const getVehicles = () => {
        if (d?.summary?.vehicles_detected) return d.summary.vehicles_detected;
        if (d?.frame_by_frame_summary?.length) {
          // Get average vehicles per frame for video
          const total = d.frame_by_frame_summary.reduce((sum, f) => sum + (f.vehicles_detected || 0), 0);
          return Math.round(total / d.frame_by_frame_summary.length);
        }
        if (d?.total_frames_analyzed && d?.frame_by_frame_summary?.length) {
          // Use total frames analyzed for video mode
          const total = d.frame_by_frame_summary.reduce((sum, f) => sum + (f.vehicles_detected || 0), 0);
          return Math.round(total / d.frame_by_frame_summary.length);
        }
        return '—';
      };
      const getPersons = () => {
        if (d?.summary?.persons_detected) return d.summary.persons_detected;
        if (d?.frame_by_frame_summary?.length) {
          // Get average persons per frame for video
          const total = d.frame_by_frame_summary.reduce((sum, f) => sum + (f.persons_detected || 0), 0);
          return Math.round(total / d.frame_by_frame_summary.length);
        }
        return '—';
      };
      const getSignal = () => {
        if (d?.summary?.signal_state) return (d.summary.signal_state || '—').toUpperCase();
        if (d?.traffic_signals?.signal_state) return (d.traffic_signals.signal_state || '—').toUpperCase();
        if (d?.frame_by_frame_summary?.length) {
          // Get most common signal state from video frames
          const signals = d.frame_by_frame_summary.map(f => f.signal_state).filter(s => s && s !== 'unknown');
          if (signals.length > 0) {
            const counts = {};
            signals.forEach(s => counts[s] = (counts[s] || 0) + 1);
            const mostCommon = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            return mostCommon?.toUpperCase() || '—';
          }
        }
        return '—';
      };
      return [
        { label: 'Vehicles', value: getVehicles() },
        { label: 'Persons', value: getPersons() },
        { label: 'Signal', value: getSignal() },
        { label: 'Time (ms)', value: lat ?? '—' },
      ];
    },
    output: (d) => {
      if (!d) return null;
      const vehicles = d?.summary?.vehicles_detected ?? '—';
      const persons = d?.summary?.persons_detected ?? '—';
      const signal = (d?.traffic_signals?.signal_state || d?.summary?.signal_state || '—').toUpperCase();
      return {
        vehicles: vehicles,
        persons: persons,
        signal: signal,
        candidates: d?.violation_candidates?.map((c) => c.candidate) ?? [],
        trackingIds: d?.summary?.tracking_ids ?? d?.frame_by_frame_summary?.length ?? 0,
      };
    },
    image: (d) => d?.annotated_image || d?.sample_annotated_frame,
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
    metrics: (d, lat) => {
      // Handle both image and video modes
      const violations = d?.violations?.length ?? d?.total_violations_detected ?? 0;
      const threatScore = d?.threat_score ?? (violations > 0 ? 75 : 0);
      // For video mode, check if violations_by_type exists and sum the counts
      if (d?.violations_by_type && Object.keys(d.violations_by_type).length > 0) {
        const total = Object.values(d.violations_by_type).reduce((sum, count) => sum + (count || 0), 0);
        return [
          { label: 'Violations', value: total },
          { label: 'Threat Score', value: threatScore ? `${threatScore}%` : '—' },
          { label: 'Verified', value: total > 0 ? 'Yes' : 'No' },
          { label: 'Time (ms)', value: lat ?? '—' },
        ];
      }
      return [
        { label: 'Violations', value: violations },
        { label: 'Threat Score', value: threatScore ? `${threatScore}%` : '—' },
        { label: 'Verified', value: d?.verified ? 'Yes' : (violations > 0 ? 'Yes' : 'No') },
        { label: 'Time (ms)', value: lat ?? '—' },
      ];
    },
    output: (d) => {
      if (!d) return null;
      const violations = d?.violations?.map((v) => v.type) ?? Object.keys(d?.violations_by_type || {});
      return {
        violations: violations,
        threatScore: d?.threat_score ?? (violations.length > 0 ? 75 : 0),
        severity: d?.violations?.map((v) => v.severity) ?? [],
        composite: d?.composite ?? `${violations.length} violation(s)`,
      };
    },
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
    metrics: (d, lat) => {
      // Handle both image and video modes
      const plate = d?.fused_plate ?? (d?.plates_found?.[0]?.plate) ?? 'N/A';
      const confidence = d?.ocr_confidence ?? d?.plates_found?.[0]?.confidence ?? '—';
      const trust = d?.trust_score ?? d?.plates_found?.[0]?.trust_score ?? '—';
      // For video mode, use total_plates_detected if available
      const platesFound = d?.total_plates_detected ?? d?.plates_found?.length ?? 0;
      // Calculate average confidence for video mode
      let avgConfidence = confidence;
      if (d?.plates_found?.length > 1 && !d?.fused_plate) {
        const confs = d.plates_found.map(p => p.confidence).filter(c => c);
        avgConfidence = confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : '—';
      }
      return [
        { label: 'Plates Found', value: platesFound },
        { label: 'Confidence', value: avgConfidence ? `${Math.min(100, avgConfidence).toFixed(0)}%` : '—' },
        { label: 'Plate', value: plate },
        { label: 'Time (ms)', value: lat ?? '—' },
      ];
    },
    output: (d) => {
      if (!d) return null;
      const plate = d?.fused_plate ?? d?.plates_found?.[0]?.plate ?? 'N/A';
      const trust = d?.trust_score ?? d?.plates_found?.[0]?.trust_score ?? '—';
      return {
        plate: plate,
        trustScore: trust ? `${Math.min(100, trust).toFixed(0)}%` : '—',
        vahan: d?.vahan?.found ? 'Match found' : 'No record',
        tampering: d?.tampering?.tampered ? 'Suspicious' : 'Clear',
      };
    },
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
      { label: 'Case ID', value: d?.case_id?.slice(-8) ?? d?.status ?? '—' },
      { label: 'Severity', value: d?.severity ?? d?.violation_count ?? '—' },
      { label: 'Status', value: d?.status ?? 'Generated' },
      { label: 'Time (ms)', value: lat ?? '—' },
    ],
    output: (d) => {
      if (!d) return null;
      return {
        caseId: d.case_id ?? 'N/A',
        evidenceId: d.evidence_id ?? 'Generated',
        hash: d.integrity_hash?.slice(0, 20) + '...' ?? 'N/A',
        status: d.status ?? 'Complete',
      };
    },
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
    metrics: (d) => {
      // Handle both image and video modes
      const totalViolations = d?.total_violations ?? d?.total_violations_detected ?? 0;
      const repeatOffenders = d?.repeat_offender_count ?? d?.repeat_offenders?.length ?? 0;
      const types = d?.violation_types?.length ?? Object.keys(d?.violations_by_type || {}).length ?? 0;
      const vehiclesTracked = d?.total_vehicles_tracked ?? d?.vehicles_by_track?.length ?? '—';
      return [
        { label: 'Total Violations', value: totalViolations },
        { label: 'Repeat Offenders', value: repeatOffenders },
        { label: 'Types Tracked', value: types },
        { label: 'Vehicles', value: vehiclesTracked },
      ];
    },
    output: (d) => {
      if (!d) return null;
      return {
        totalViolations: d?.total_violations ?? d?.total_violations_detected ?? 0,
        repeatOffenders: d?.repeat_offender_count ?? d?.repeat_offenders?.length ?? 0,
        topTypes: d?.violation_types?.slice(0, 3).map((t) => t.name) ?? Object.keys(d?.violations_by_type || {}).slice(0, 3),
        vehiclesTracked: d?.total_vehicles_tracked ?? 0,
      };
    },
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
