import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './client.js';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('injects bearer token when present', async () => {
    localStorage.setItem('pds_token', 'test-token');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: 'ok' }),
    });
    await api.me();
    const [, opts] = spy.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer test-token');
  });

  it('returns null on 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 204, json: async () => ({}),
    });
    expect(await api.deleteLoop('X')).toBeNull();
  });

  it('handles 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 404, json: async () => ({ detail: 'Not found' }),
    });
    await expect(api.getLoop('MISSING')).rejects.toThrow('Not found');
  });

  it('serializes login payload', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ access_token: 't', username: 'u', role: 'r' }),
    });
    await api.login('admin', 'admin123');
    const [, opts] = spy.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ username: 'admin', password: 'admin123' });
  });
});
