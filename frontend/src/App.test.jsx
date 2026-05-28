import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

describe('App shell', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows login screen when no token', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
  });

  it('renders layout when token exists', () => {
    localStorage.setItem('pds_token', 'fake-token');
    localStorage.setItem('pds_user', JSON.stringify({ username: 'admin', role: 'admin', display_name: '管理员' }));
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '全景驾驶舱' })).toBeInTheDocument();
    expect(screen.getByText('回路建模')).toBeInTheDocument();
    expect(screen.getAllByText('管理员').length).toBeGreaterThan(0);
  });
});
