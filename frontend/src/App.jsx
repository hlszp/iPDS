import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LoopDetail from './pages/LoopDetail';
import TuningWorkspace from './pages/TuningWorkspace';
import TuningSelector from './pages/TuningSelector';
import Config from './pages/Config';
import Reports from './pages/Reports';
import Commissioning from './pages/Commissioning';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pds_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('pds_user') || 'null'));

  const onLogin = (t, u) => {
    localStorage.setItem('pds_token', t);
    localStorage.setItem('pds_user', JSON.stringify(u));
    setToken(t); setUser(u);
  };

  if (!token) return <Login onLogin={onLogin} />;

  return (
    <Layout user={user} onLogout={() => { localStorage.clear(); setToken(null); setUser(null); }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/loop/:tagName" element={<LoopDetail />} />
        <Route path="/loop/:tagName/tuning" element={<TuningWorkspace />} />
        <Route path="/config" element={<Config />} />
        <Route path="/tuning" element={<TuningSelector />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/commissioning" element={<Commissioning />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
