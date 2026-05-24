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
    expect(screen.getByText('驾驶舱')).toBeInTheDocument();
    expect(screen.getByText('回路管理')).toBeInTheDocument();
    expect(screen.getByText('管理员')).toBeInTheDocument();
  });
});
