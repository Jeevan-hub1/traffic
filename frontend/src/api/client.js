import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 180000,
});

const PIPELINE_KEY = 'safevision_pipeline_result';

export function savePipelineResult(data) {
  sessionStorage.setItem(PIPELINE_KEY, JSON.stringify(data));
}

export function getPipelineResult() {
  try {
    const raw = sessionStorage.getItem(PIPELINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function analyzeQuality(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/quality/analyze', form);
  return data;
}

export async function detectObjects(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/detection/detect', form);
  return data;
}

export async function detectFrames(files) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { data } = await api.post('/detection/detect-frames', form);
  return data;
}

export async function verifyViolations(payload) {
  const { data } = await api.post('/violation/verify', payload);
  return data;
}

export async function recognizePlate(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/lpr/recognize', form);
  return data;
}

export async function recognizePlateMulti(files) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { data } = await api.post('/lpr/recognize-multi', form);
  return data;
}

export async function generateEvidence(payload) {
  const { data } = await api.post('/evidence/generate', payload);
  return data;
}

export async function getAnalyticsSummary() {
  const { data } = await api.get('/analytics/summary');
  return data;
}

export async function getAnalyticsTrends() {
  const { data } = await api.get('/analytics/trends');
  return data;
}

export async function getAnalyticsInsights() {
  const { data } = await api.get('/analytics/insights');
  return data;
}

export async function getEvaluationMetrics() {
  const { data } = await api.get('/evaluation/metrics');
  return data;
}

export async function getSystemHealth() {
  const { data } = await api.get('/evaluation/health');
  return data;
}

export async function getForecast() {
  const { data } = await api.get('/predictions/forecast');
  return data;
}

export async function getRiskZones() {
  const { data } = await api.get('/predictions/risk-zones');
  return data;
}

export async function getDeployments() {
  const { data } = await api.get('/predictions/deployments');
  return data;
}

export async function getCitySafetyIndex() {
  const { data } = await api.get('/predictions/city-safety-index');
  return data;
}

export async function detectSignal(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/detection/signal', form);
  return data;
}

export async function getCommandCenter() {
  const { data } = await api.get('/command-center/dashboard');
  return data;
}

export async function vahanLookup(plate) {
  const { data } = await api.get(`/lpr/vahan/${encodeURIComponent(plate)}`);
  return data;
}

export async function processPipeline(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/pipeline/process', form);
  savePipelineResult(data);
  return data;
}

export async function queryAssistant(question) {
  const { data } = await api.post('/assistant/query', { question });
  return data;
}

export default api;
