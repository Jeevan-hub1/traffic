const NODE_COLORS = {
  vehicle: { stroke: '#4f46e5', bg: '#eef2ff' },
  person: { stroke: '#059669', bg: '#ecfdf5' },
  equipment: { stroke: '#dc2626', bg: '#fef2f2' },
  plate: { stroke: '#7c3aed', bg: '#f5f3ff' },
  traffic_signal: { stroke: '#dc2626', bg: '#fef2f2' },
};

const ICONS = {
  vehicle: '🚗',
  person: '👤',
  equipment: '⛑',
  plate: '🔢',
  violation_candidate: '⚠️',
  traffic_signal: '🚦',
};

export function sceneGraphToFlow(graph, candidates = []) {
  if (!graph?.nodes?.length) return { nodes: [], edges: [] };

  const positions = {};
  const vehicles = graph.nodes.filter((n) => n.type === 'vehicle');
  vehicles.forEach((v, i) => {
    positions[v.id] = { x: 200 + i * 180, y: 20 };
  });

  let personIdx = 0;
  graph.nodes.forEach((n) => {
    if (n.type === 'person') {
      positions[n.id] = { x: 40 + personIdx * 170, y: 160 };
      personIdx++;
    }
    if (n.type === 'traffic_signal') {
      positions[n.id] = { x: 420, y: 80 };
    }
  });

  let leafIdx = 0;
  graph.nodes.forEach((n) => {
    if (['equipment', 'plate', 'violation_candidate'].includes(n.type)) {
      positions[n.id] = { x: 60 + leafIdx * 200, y: n.type === 'violation_candidate' ? 440 : 300 };
      leafIdx++;
    }
  });

  const nodes = graph.nodes.map((n) => {
    const style = NODE_COLORS[n.type] || NODE_COLORS.vehicle;
    const icon = ICONS[n.type] || '•';
    return {
      id: n.id,
      position: positions[n.id] || { x: 100, y: 100 },
      data: {
        label: `${icon} ${n.label}\n${n.confidence ? `${n.confidence}%` : ''}`.trim(),
      },
      style: {
        background: style.bg,
        border: `2px solid ${style.stroke}`,
        borderRadius: 12,
        padding: '12px 16px',
        color: '#0f172a',
        fontSize: 12,
        fontWeight: 600,
        minWidth: 140,
        textAlign: 'center',
        whiteSpace: 'pre',
        boxShadow: `0 4px 12px ${style.stroke}25`,
      },
    };
  });

  const edges = (graph.edges || []).map((e, i) => {
    const color = e.relation === 'candidate' ? '#dc2626' : '#4f46e5';
    return {
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.relation,
      animated: e.relation === 'candidate',
      style: { stroke: color, strokeWidth: 2 },
      labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
    };
  });

  return { nodes, edges };
}

export function detectionBoxesFromScene(scene, objects = []) {
  const boxes = [];
  for (const v of scene?.vehicles || []) {
    boxes.push({
      label: v.label?.charAt(0).toUpperCase() + v.label?.slice(1),
      confidence: v.confidence,
      type: 'vehicle',
      color: '#4f46e5',
      missing: false,
    });
    for (const o of v.occupants || []) {
      boxes.push({
        label: o.role?.charAt(0).toUpperCase() + o.role?.slice(1),
        confidence: o.confidence,
        type: 'person',
        color: o.role === 'rider' || o.role === 'driver' ? '#059669' : '#d97706',
        missing: false,
      });
      if (o.helmet?.status === 'missing') {
        boxes.push({
          label: 'Helmet (Missing)',
          confidence: o.helmet.confidence,
          type: 'equipment',
          color: '#dc2626',
          missing: true,
        });
      }
    }
    if (v.plate?.detected) {
      boxes.push({
        label: 'License Plate',
        confidence: v.plate.confidence,
        type: 'plate',
        color: '#7c3aed',
        missing: false,
      });
    }
  }
  if (!boxes.length && objects.length) {
    objects.forEach((o) => {
      boxes.push({
        label: o.label,
        confidence: o.confidence,
        type: o.type,
        color: o.type === 'vehicle' ? '#4f46e5' : '#059669',
        missing: false,
      });
    });
  }
  return boxes;
}
