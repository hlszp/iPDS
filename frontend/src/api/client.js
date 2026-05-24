const BASE = '/api';

async function parseError(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
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
  listLoops: (params = {}) => request('/config/loops?' + new URLSearchParams(params)),
  getLoop: (tag) => request(`/config/loops/${tag}`),
  createLoop: (data) => request('/config/loops', { method: 'POST', body: JSON.stringify(data) }),
  updateLoop: (tag, data) => request(`/config/loops/${tag}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLoop: (tag) => request(`/config/loops/${tag}`, { method: 'DELETE' }),

  // Loop data (engine endpoints)
  getDashboard: () => request('/loop/dashboard'),
  getLoopDetail: (tag) => request(`/loop/${tag}/detail`),
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
  validateLoops: (unit) => request(`/commissioning/validate${unit ? '?unit=' + encodeURIComponent(unit) : ''}`),
  getCommissioningReadiness: (unit) => request(`/commissioning/readiness${unit ? '?unit=' + encodeURIComponent(unit) : ''}`),

  // Features
  listFeatures: () => request('/features'),
  updateFeature: (key, enabled) => request(`/features/${key}?enabled=${enabled}`, { method: 'PUT' }),

  // Reports
  generateLoopReport: (tag) => requestFile(`/reports/loop/${tag}`),
  generateBatchReport: (unit, period) => requestFile(`/reports/batch?unit=${encodeURIComponent(unit || '全厂')}&period=${encodeURIComponent(period || '日报')}`),
};
