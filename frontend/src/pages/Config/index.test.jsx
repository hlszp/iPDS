import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Config from './index.jsx';

function mockConfigFetch({ loops = [], groups = [], warnings = [] } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/config/loops')) {
      return { ok: true, status: 200, json: async () => loops };
    }
    if (url.includes('/config/groups')) {
      return { ok: true, status: 200, json: async () => groups };
    }
    if (url.includes('/commissioning/validate')) {
      return { ok: true, status: 200, json: async () => ({ warnings }) };
    }
    return { ok: true, status: 200, json: async () => [] };
  });
}

describe('Config page', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows loading state', () => {
    mockConfigFetch();
    render(<MemoryRouter><Config /></MemoryRouter>);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state after load', async () => {
    mockConfigFetch();
    render(<MemoryRouter initialEntries={['/config?unit=空装置']}><Config /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('该装置暂无回路配置')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loop table when data exists', async () => {
    mockConfigFetch({
      loops: [{ tag_name: 'FIC-10001', unit: '测试装置', loop_type: 'FLOW', description: '流量控制' }],
    });
    render(<MemoryRouter initialEntries={['/config?unit=测试装置']}><Config /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('FIC-10001')).toBeInTheDocument();
      expect(screen.getAllByText('测试装置').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
