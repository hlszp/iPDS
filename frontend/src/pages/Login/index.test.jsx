import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './index.jsx';

describe('Login page', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders form fields', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
  });

  it('calls onLogin on success', async () => {
    const { api } = await import('../../api/client.js');
    vi.spyOn(api, 'login').mockResolvedValue({
      access_token: 'tok', username: 'admin', role: 'admin', display_name: '管理员',
    });
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('用户名'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /登/ }));
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('tok', expect.objectContaining({ username: 'admin' }));
    });
  });

  it('shows error on failed login', async () => {
    const { api } = await import('../../api/client.js');
    vi.spyOn(api, 'login').mockRejectedValue(new Error('Invalid'));
    render(<Login onLogin={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('用户名'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /登/ }));
    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });
  });
});
