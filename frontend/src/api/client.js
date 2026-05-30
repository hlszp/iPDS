const BASE = '/api';
const responseCache = new Map();

async function parseError(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, value);
  });
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('pds_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

function clearCache(keys = []) {
  keys.forEach((key) => responseCache.delete(key));
}

function cachedRequest(key, loader) {
  const hit = responseCache.get(key);
  if (hit) return hit;
  const pending = loader()
    .then((data) => {
      responseCache.set(key, Promise.resolve(data));
      return data;
    })
    .catch((error) => {
      responseCache.delete(key);
      throw error;
    });
  responseCache.set(key, pending);
  return pending;
}

async function requestFile(path, options = {}) {
  const token = localStorage.getItem('pds_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  listUsers: () => request('/auth/users'),

  // Config
  listLoops: (params = {}) => request(withQuery('/config/loops', params)),
  getLoop: (tag) => request(`/config/loops/${tag}`),
  createLoop: (data) => request('/config/loops', { method: 'POST', body: JSON.stringify(data) }),
  updateLoop: (tag, data) => request(`/config/loops/${tag}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLoop: (tag) => request(`/config/loops/${tag}`, { method: 'DELETE' }),
  listGroups: (params = {}) => request(withQuery('/config/groups', params)),
  createGroup: (data) => request('/config/groups', { method: 'POST', body: JSON.stringify(data) }),
  deleteGroup: (id) => request(`/config/groups/${id}`, { method: 'DELETE' }),

  // Loop data (engine endpoints)
  getDashboard: () => request('/loop/dashboard'),
  getLoopDetail: (tag) => request(`/loop/${tag}/detail`),
  getLoopHistory: (tag, params = {}) => request(withQuery(`/loop/${tag}/history`, params)),
  getExcitation: (tag) => request(`/loop/${tag}/excitation`),
  runTuning: (tag, method, desiredTau) => request(`/loop/${tag}/tuning`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: tag, method: method || 'imc', desired_tau: desiredTau || null }),
  }),

  // Commissioning
  downloadTemplate: () => requestFile('/commissioning/template'),
  importCsv: (file, unit) => {
    const form = new FormData();
    form.append('file', file);
    return requestFile(`/commissioning/import?unit=${encodeURIComponent(unit)}`, { method: 'POST', body: form });
  },
  validateLoops: (unit) => request(withQuery('/commissioning/validate', { unit })),
  getCommissioningReadiness: (unit) => request(withQuery('/commissioning/readiness', { unit })),

  // Features
  listFeatures: () => cachedRequest('features', () => request('/features')),
  updateFeature: async (key, enabled) => {
    const result = await request(`/features/${key}?enabled=${enabled}`, { method: 'PUT' });
    clearCache(['features']);
    return result;
  },

  // Reports
  generateLoopReport: (tag) => requestFile(`/reports/loop/${tag}`),
  generateBatchReport: (unit, period) => requestFile(`/reports/batch?unit=${encodeURIComponent(unit || '全厂')}&period=${encodeURIComponent(period || '日报')}`),

  // Plant & Device hierarchy
  getPlantTree: () => cachedRequest('plant-tree', () => request('/plants/tree')),
  listPlants: () => request('/plants'),
  createPlant: (data) => request('/plants', { method: 'POST', body: JSON.stringify(data) }),
  updatePlant: (id, data) => request(`/plants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlant: (id) => request(`/plants/${id}`, { method: 'DELETE' }),
  listDevices: (plantId) => request(`/plants/${plantId}/devices`),
  createDevice: (plantId, data) => request(`/plants/${plantId}/devices`, { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id, data) => request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: 'DELETE' }),

  // Runtime source
  getRuntimeSource: () => cachedRequest('runtime-source', () => request('/production/runtime-source')),
  updateRuntimeSource: async (source) => {
    const result = await request('/production/runtime-source', { method: 'PUT', body: JSON.stringify({ source }) });
    clearCache(['runtime-source']);
    return result;
  },
  validateRuntimeSource: () => request('/production/runtime-source/validate', { method: 'POST' }),

  // Overview & Monitoring
  getOverview: (params = {}) => request(withQuery('/overview/summary', params)),
  getMonitoringRealtime: (params = {}) => request(withQuery('/monitoring/realtime', params)),
  getMonitoringHistory: (params = {}) => request(withQuery('/monitoring/history', params)),

  // Assessment
  getAssessmentRealtime: (params = {}) => request(withQuery('/assessment/realtime', params)),
  getRadar: (tag) => request(`/assessment/${tag}/radar`),
  getSuggestions: (tag) => request(`/assessment/${tag}/suggestions`),

  // Ops — scheduler & audit reads
  getSchedulerJobs: () => request('/ops/scheduler/jobs'),
  getSchedulerRuns: (jobKey) => request(withQuery('/ops/scheduler/runs', jobKey ? { job_key: jobKey } : {})),
  getReportJobs: () => request('/ops/reports/jobs'),
  getReportArtifacts: (jobId) => request(withQuery('/ops/reports/artifacts', jobId ? { job_id: jobId } : {})),
  getAuditEvents: () => request('/production/audit-events'),

  // Identification & Simulation
  getIdentification: (tag) => request(`/identification/${tag}`),
  getExcitation: (tag) => request(`/identification/${tag}/excitation`),
  getSimulationScenarios: () => request('/simulation/scenarios'),
  runSimulation: (data) => request('/simulation/run', { method: 'POST', body: JSON.stringify(data) }),
};
