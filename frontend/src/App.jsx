import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';

const LoopDetail = lazy(() => import('./pages/LoopDetail'));
const TuningWorkspace = lazy(() => import('./pages/TuningWorkspace'));
const TuningSelector = lazy(() => import('./pages/TuningSelector'));
const Config = lazy(() => import('./pages/Config'));
const Reports = lazy(() => import('./pages/Reports'));
const Commissioning = lazy(() => import('./pages/Commissioning'));
const Settings = lazy(() => import('./pages/Settings'));
const Overview = lazy(() => import('./pages/Overview'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Assessment = lazy(() => import('./pages/Assessment'));
const AssessmentDetail = lazy(() => import('./pages/Assessment/AssessmentDetail'));
const Identification = lazy(() => import('./pages/Identification'));
const Simulation = lazy(() => import('./pages/Simulation'));
const SchedulerAudit = lazy(() => import('./pages/SchedulerAudit'));

const routeFallback = <div style={{ padding: 24 }}>加载中...</div>;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pds_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('pds_user') || 'null'));

  const onLogin = (t, u) => {
    localStorage.setItem('pds_token', t);
    localStorage.setItem('pds_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const onLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  if (!token) return <Login onLogin={onLogin} />;

  return (
    <Layout user={user} onLogout={onLogout}>
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/assessment/:tagName" element={<AssessmentDetail />} />
          <Route path="/loop/:tagName" element={<LoopDetail />} />
          <Route path="/loop/:tagName/tuning" element={<TuningWorkspace />} />
          <Route path="/config" element={<Config />} />
          <Route path="/tuning" element={<TuningSelector />} />
          <Route path="/identification" element={<Identification />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/scheduler" element={<SchedulerAudit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/commissioning" element={<Commissioning />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
