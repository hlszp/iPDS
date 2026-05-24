import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Config from './index.jsx';

describe('Config page', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows loading state', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    });
    render(<MemoryRouter><Config /></MemoryRouter>);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    });
    render(<MemoryRouter><Config /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('暂无回路配置')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loop table when data exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => [{ tag_name: 'FIC-10001', unit: '测试装置', loop_type: 'FLOW', description: '流量控制' }],
    });
    render(<MemoryRouter><Config /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('FIC-10001')).toBeInTheDocument();
      expect(screen.getByText('测试装置')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
