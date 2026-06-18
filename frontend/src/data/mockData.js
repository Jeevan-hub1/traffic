// Mock Data for SafeVision AI Platform

export const violations = [
  { id: 'VIO-2847', vehicle: 'AP39AB1234', type: 'Helmet Non-Compliance', severity: 'medium', location: 'MG Road Junction', time: '10:15 AM', confidence: 98.4, plate: 'AP39AB1234', status: 'confirmed' },
  { id: 'VIO-2848', vehicle: 'TN22CD5678', type: 'Red Light Violation', severity: 'critical', location: 'Metro Junction', time: '10:21 AM', confidence: 97.1, plate: 'TN22CD5678', status: 'confirmed' },
  { id: 'VIO-2849', vehicle: 'KA05EF9012', type: 'Triple Riding', severity: 'high', location: 'Market Road', time: '10:33 AM', confidence: 96.8, plate: 'KA05EF9012', status: 'confirmed' },
  { id: 'VIO-2850', vehicle: 'MH12GH3456', type: 'Seatbelt Non-Compliance', severity: 'medium', location: 'Ring Road Flyover', time: '10:47 AM', confidence: 94.2, plate: 'MH12GH3456', status: 'pending' },
  { id: 'VIO-2851', vehicle: 'DL08IJ7890', type: 'Wrong-Side Driving', severity: 'critical', location: 'Central Avenue', time: '11:02 AM', confidence: 99.1, plate: 'DL08IJ7890', status: 'confirmed' },
  { id: 'VIO-2852', vehicle: 'GJ01KL2345', type: 'Illegal Parking', severity: 'low', location: 'Civil Lines', time: '11:18 AM', confidence: 91.7, plate: 'GJ01KL2345', status: 'confirmed' },
  { id: 'VIO-2853', vehicle: 'RJ14MN6789', type: 'Stop-Line Violation', severity: 'high', location: 'East Gate Junction', time: '11:25 AM', confidence: 95.3, plate: 'RJ14MN6789', status: 'confirmed' },
  { id: 'VIO-2854', vehicle: 'UP32OP1234', type: 'Triple Riding', severity: 'high', location: 'Old Market Circle', time: '11:41 AM', confidence: 93.5, plate: 'UP32OP1234', status: 'pending' },
];

export const repeatOffenders = [
  { plate: 'TN22CD5678', violations: 12, lastSeen: '10:21 AM', riskScore: 94, types: ['Red Light', 'Wrong-Side', 'Speeding'] },
  { plate: 'DL08IJ7890', violations: 9, lastSeen: '11:02 AM', riskScore: 89, types: ['Wrong-Side', 'Stop Line'] },
  { plate: 'AP39AB1234', violations: 7, lastSeen: '10:15 AM', riskScore: 76, types: ['Helmet', 'Triple Riding'] },
  { plate: 'KA05EF9012', violations: 6, lastSeen: '10:33 AM', riskScore: 71, types: ['Triple Riding', 'Helmet'] },
  { plate: 'MH12GH3456', violations: 5, lastSeen: '10:47 AM', riskScore: 63, types: ['Seatbelt', 'Parking'] },
];

export const junctions = [
  { name: 'Metro Junction', safetyScore: 28, riskLevel: 'critical', violations: 47, factors: ['Wrong-Side Driving', 'Red Light Violations', 'Illegal Parking'], lat: 17.385, lng: 78.487 },
  { name: 'MG Road Junction', safetyScore: 41, riskLevel: 'high', violations: 38, factors: ['Helmet Violations', 'Triple Riding', 'Stop Line'], lat: 17.430, lng: 78.454 },
  { name: 'Market Road', safetyScore: 52, riskLevel: 'high', violations: 31, factors: ['Triple Riding', 'Parking Violations'], lat: 17.360, lng: 78.470 },
  { name: 'Central Avenue', safetyScore: 61, riskLevel: 'medium', violations: 24, factors: ['Seatbelt', 'Stop Line'], lat: 17.400, lng: 78.500 },
  { name: 'East Gate Junction', safetyScore: 74, riskLevel: 'medium', violations: 18, factors: ['Stop Line', 'Parking'], lat: 17.420, lng: 78.520 },
  { name: 'Ring Road Flyover', safetyScore: 82, riskLevel: 'low', violations: 11, factors: ['Seatbelt', 'Phone Usage'], lat: 17.370, lng: 78.440 },
];

export const violationTrend = [
  { time: '00:00', violations: 3 }, { time: '02:00', violations: 1 }, { time: '04:00', violations: 2 },
  { time: '06:00', violations: 8 }, { time: '08:00', violations: 24 }, { time: '10:00', violations: 42 },
  { time: '12:00', violations: 36 }, { time: '14:00', violations: 31 }, { time: '16:00', violations: 38 },
  { time: '18:00', violations: 51 }, { time: '20:00', violations: 29 }, { time: '22:00', violations: 12 },
];

export const weeklyTrend = [
  { day: 'Mon', violations: 143 }, { day: 'Tue', violations: 167 },
  { day: 'Wed', violations: 154 }, { day: 'Thu', violations: 189 },
  { day: 'Fri', violations: 212 }, { day: 'Sat', violations: 231 },
  { day: 'Sun', violations: 98 },
];

export const violationTypes = [
  { name: 'Helmet', value: 32, color: '#6366f1' },
  { name: 'Red Light', value: 24, color: '#ef4444' },
  { name: 'Triple Riding', value: 18, color: '#f59e0b' },
  { name: 'Seatbelt', value: 14, color: '#8b5cf6' },
  { name: 'Parking', value: 8, color: '#10b981' },
  { name: 'Wrong-Side', value: 4, color: '#ec4899' },
];

export const systemMetrics = {
  detection: { accuracy: 96.8, precision: 97.2, recall: 95.4, f1: 96.3, mAP50: 94.8, mAP5095: 87.3 },
  ocr: { charAccuracy: 98.1, plateAccuracy: 95.7, trustScoreAccuracy: 94.2 },
  latency: { detection: 45, ocr: 23, reportGen: 12, total: 80 },
  throughput: { imagesPerSec: 28.4, framesPerSec: 42.1 },
  health: { overall: 94, accuracy: 97, ocr: 96, latency: 91, reliability: 92 },
};

export const replayScenarios = [
  {
    id: 'RED-001',
    name: 'Red Light Violation — Metro Junction',
    vehicle: 'TN22CD5678',
    frames: [
      { id: 1, label: 'Vehicle Approaching', signal: 'green', annotation: 'Vehicle detected at 45m from stop line', time: '10:21:01', status: 'normal' },
      { id: 2, label: 'Signal Warning', signal: 'yellow', annotation: 'Signal transitioning to red, vehicle at 28m', time: '10:21:03', status: 'warning' },
      { id: 3, label: 'Signal Turns Red', signal: 'red', annotation: 'Red signal active, vehicle at 12m — decelerating expected', time: '10:21:05', status: 'warning' },
      { id: 4, label: 'Stop Line Crossed', signal: 'red', annotation: 'Vehicle crosses stop line at 10:21:07 — VIOLATION BEGINS', time: '10:21:07', status: 'violation' },
      { id: 5, label: 'Junction Entry', signal: 'red', annotation: 'Vehicle enters intersection — VIOLATION CONFIRMED', time: '10:21:09', status: 'confirmed' },
    ]
  },
  {
    id: 'HELM-002',
    name: 'Helmet Non-Compliance — MG Road',
    vehicle: 'AP39AB1234',
    frames: [
      { id: 1, label: 'Motorcycle Detected', signal: 'green', annotation: 'Motorcycle detected: Track ID Bike_047', time: '10:15:01', status: 'normal' },
      { id: 2, label: 'Rider Analysis', signal: 'green', annotation: 'Rider detected, helmet detection initiated', time: '10:15:02', status: 'normal' },
      { id: 3, label: 'Helmet Check', signal: 'green', annotation: 'No helmet detected on rider — confidence 97.4%', time: '10:15:03', status: 'warning' },
      { id: 4, label: 'Triple Check', signal: 'green', annotation: 'Helmet absence confirmed across 3 frames', time: '10:15:05', status: 'violation' },
      { id: 5, label: 'Violation Confirmed', signal: 'green', annotation: 'Helmet Non-Compliance — CONFIRMED, evidence captured', time: '10:15:06', status: 'confirmed' },
    ]
  },
  {
    id: 'TRIP-003',
    name: 'Triple Riding — Market Road',
    vehicle: 'KA05EF9012',
    frames: [
      { id: 1, label: 'Motorcycle Detected', signal: 'green', annotation: 'Motorcycle detected: Track ID Bike_103', time: '10:33:01', status: 'normal' },
      { id: 2, label: 'Rider Counted', signal: 'green', annotation: 'Rider 1 detected — normal', time: '10:33:02', status: 'normal' },
      { id: 3, label: 'Passenger 1', signal: 'green', annotation: 'Passenger detected — total occupants: 2', time: '10:33:03', status: 'warning' },
      { id: 4, label: 'Passenger 2', signal: 'green', annotation: 'Additional passenger confirmed — total occupants: 3', time: '10:33:04', status: 'violation' },
      { id: 5, label: 'Violation Confirmed', signal: 'green', annotation: 'Triple Riding — CONFIRMED. Allowed: 2, Detected: 3', time: '10:33:06', status: 'confirmed' },
    ]
  }
];

export const evidencePackages = [
  {
    id: 'EVD-001',
    caseId: 'CASE-2026-8472',
    violationId: 'VIO-2848',
    vehicle: 'TN22CD5678',
    type: 'Red Light Violation',
    severity: 'critical',
    location: 'Metro Junction, Hyderabad',
    timestamp: '2026-06-17T10:21:09',
    camera: 'CAM-MJ-04',
    confidence: 97.1,
    threatScore: 92,
    hash: 'a3f4b8c2d1e6f9a0b3c7d4e2f1a8b5c9d0e3f6a1b4c7d8e2f5a0b3c6d9e1',
    timeline: [
      { time: '10:21:01', event: 'Vehicle detected approaching junction', type: 'info' },
      { time: '10:21:03', event: 'Traffic signal changed to yellow', type: 'warning' },
      { time: '10:21:05', event: 'Signal transitioned to RED', type: 'warning' },
      { time: '10:21:07', event: 'Vehicle crossed stop line — violation begins', type: 'violation' },
      { time: '10:21:09', event: 'Vehicle entered junction — VIOLATION CONFIRMED', type: 'critical' },
      { time: '10:21:10', event: 'Evidence package generated', type: 'info' },
    ],
    explanation: 'Vehicle TN22CD5678 was detected approaching Metro Junction at approximately 45 km/h. Traffic signal transitioned to red at 10:21:05. Despite the active red signal, the vehicle failed to stop at the designated stop line and proceeded through the junction. Violation confirmed across 5 consecutive frames with 97.1% confidence. License plate verified with trust score 94.8.',
    ocrDetails: { plate: 'TN22CD5678', confidence: 96.4, trustScore: 94.8, tampered: false, frames: ['TN22CD5678', 'TN22CD5678', 'TN22C05678', 'TN22CD5678'] }
  },
];

export const predictions = {
  tomorrow: {
    expectedViolations: 247,
    changePercent: +18,
    peakHour: '08:00 - 09:00',
    highRiskZones: ['Metro Junction', 'Market Road', 'MG Road Junction'],
    recommendedOfficers: [
      { zone: 'Metro Junction', count: 4, reason: 'Historical peak violations + monsoon forecast' },
      { zone: 'Market Road', count: 3, reason: 'Weekly market day — increased triple riding risk' },
      { zone: 'MG Road Junction', count: 2, reason: 'Morning office rush — helmet compliance drops' },
    ],
    weatherRisk: { condition: 'Rain Expected', riskFactor: '+23%', impact: 'Reduced visibility, increased stop-line violations' },
    modelConfidence: 87.4,
  },
  weekForecast: [
    { day: 'Mon', predicted: 198, confidence: 91 }, { day: 'Tue', predicted: 221, confidence: 89 },
    { day: 'Wed', predicted: 209, confidence: 87 }, { day: 'Thu', predicted: 247, confidence: 86 },
    { day: 'Fri', predicted: 263, confidence: 84 }, { day: 'Sat', predicted: 289, confidence: 82 },
    { day: 'Sun', predicted: 134, confidence: 88 },
  ],
};

export const commandStats = {
  totalToday: 247,
  activeAlerts: 8,
  riskScore: 76,
  camerasOnline: 48,
  pendingReview: 12,
  evidenceGenerated: 231,
};

export const assistantResponses = {
  'top repeat offenders': {
    type: 'table',
    title: 'Top Repeat Offenders',
    data: repeatOffenders,
  },
  'most dangerous junction': {
    type: 'card',
    title: 'Most Dangerous Junction',
    data: junctions[0],
  },
  'metro junction': {
    type: 'analysis',
    title: 'Metro Junction Analysis',
    data: junctions[0],
  },
  'weekly report': {
    type: 'report',
    title: 'Weekly Violation Report — Week 24',
    summary: 'Total violations this week: 1,194 (+8.2% vs last week). Critical violations: 89. Evidence generated: 1,089. Top violator: TN22CD5678 (12 violations).',
  },
  'helmet violations': {
    type: 'stats',
    title: 'Helmet Violation Analysis',
    count: 312,
    trend: '+5.4%',
    peakHour: '08:00-09:00',
  },
  'default': {
    type: 'info',
    title: 'SafeVision AI Assistant',
    message: 'I can help you with violation analytics, junction safety, offender tracking, and enforcement recommendations. Try asking about specific junctions, violation types, or request a report.',
  }
};
