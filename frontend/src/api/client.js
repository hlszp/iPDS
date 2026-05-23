const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('pds_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),

  // Config
  listLoops: (params = {}) => request('/config/loops?' + new URLSearchParams(params)),
  getLoop: (tag) => request(`/config/loops/${tag}`),
  createLoop: (data) => request('/config/loops', { method: 'POST', body: JSON.stringify(data) }),
  updateLoop: (tag, data) => request(`/config/loops/${tag}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLoop: (tag) => request(`/config/loops/${tag}`, { method: 'DELETE' }),

  // Assessment (mock — will be wired to real endpoints in Phase 3)
  getAssessment: (tag) => request(`/config/loops/${tag}`), // placeholder
  getDashboardData: () => Promise.resolve({ kpi: { autoRate: 96.8, stabilityRate: 93.2, problemLoops: 23, alarms: 1247 }, heatmap: [], top10: [], events: [] }),
};
