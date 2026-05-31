import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

function mockShellFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/plants/tree')) {
      return { ok: true, status: 200, json: async () => ({ plants: [] }) };
    }
    if (url.includes('/production/runtime-source')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ configured_source: 'mock', effective_source: 'mock', served_loop_count: 21, expected_loop_count: 21, degraded: false, detail: 'using mock demo data' }),
      };
    }
    if (url.includes('/features')) {
      return { ok: true, status: 200, json: async () => ([{ key: 'assessment', enabled: true }]) };
    }
    if (url.includes('/overview/summary')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ auto_control_rate: 100, total_loops: 21, auto_loops: 21, manual_loops: 0, prev_hour_kpi: { performance_score: 80, auto_control_rate: 100, stability_rate: 90 }, top_loops: [], bottom_loops: [], detail_table: [], grade_filter_options: [], runtime_provider: { configured_source: 'mock', effective_source: 'mock', served_loop_count: 21, expected_loop_count: 21, degraded: false, detail: 'using mock demo data' } }),
      };
    }
    return { ok: true, status: 200, json: async () => [] };
  });
}

describe('App shell', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('shows login screen when no token', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
  });

  it('renders layout when token exists', async () => {
    mockShellFetch();
    localStorage.setItem('pds_token', 'fake-token');
    localStorage.setItem('pds_user', JSON.stringify({ username: 'admin', role: 'admin', display_name: '管理员' }));
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '全景驾驶舱' })).toBeInTheDocument();
    });
    expect(screen.getByText('回路建模')).toBeInTheDocument();
    expect(screen.getAllByText('管理员').length).toBeGreaterThan(0);
  });
});
