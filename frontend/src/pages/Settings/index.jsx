import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function Settings() {
  const [features, setFeatures] = useState([]);
  const [users, setUsers] = useState([]);
  const [featureError, setFeatureError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pds_user') || '{}'); } catch { return {}; }
  });
  const isAdmin = user.role === 'admin';

  const loadFeatures = async () => {
    setFeatureError('');
    try {
      setFeatures(await api.listFeatures());
    } catch (e) {
      setFeatureError(e.message || '功能开关加载失败');
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setUsersError('');
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      setUsersError(e.message || '用户列表加载失败');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadFeatures();
    loadUsers();
  }, []);

  const toggleFeature = async (key, enabled) => {
    try {
      await api.updateFeature(key, !enabled);
      setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f));
    } catch (e) {
      setFeatureError(e.message || '功能开关更新失败');
    }
  };

  const FEATURE_LABELS = {
    assessment: '回路评估', diagnosis: '故障诊断', identification: '系统辨识',
    tuning: 'PID 整定', simulation: '闭环仿真', reporting: '报告生成',
    alarm_management: '报警管理',
  };

  return (
    <div style={{padding:24,height:'100%',overflow:'auto'}}>
      <h2 style={{color:'#fff',fontSize:'var(--font-xl)',marginBottom:20}}>系统设置</h2>

      <div style={{maxWidth:820}}>
        <h3 style={{color:'var(--text)',fontSize:'var(--font-md)',marginBottom:12,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>功能开关</h3>
        {featureError && <InlineError text={featureError} onRetry={loadFeatures} />}
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {features.map(f => (
            <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface)',borderRadius:4}}>
              <div>
                <div style={{color:'#fff',fontSize:'var(--font-md)'}}>{FEATURE_LABELS[f.key] || f.key}</div>
                <div style={{color:'var(--text-dim)',fontSize:'var(--font-sm)'}}>{f.key}</div>
              </div>
              <button onClick={() => toggleFeature(f.key, f.enabled)}
                style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
                  background:f.enabled?'var(--green)':'rgba(255,255,255,0.1)',
                  position:'relative',transition:'background 0.2s'}}>
                <span style={{position:'absolute',top:2,left:f.enabled?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}} />
              </button>
            </div>
          ))}
        </div>

        {isAdmin && (
          <>
            <h3 style={{color:'var(--text)',fontSize:'var(--font-md)',marginTop:28,marginBottom:12,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>用户管理</h3>
            <div style={{padding:16,background:'var(--surface)',borderRadius:6,marginBottom:12,color:'var(--text-dim)',fontSize:'var(--font-sm)',lineHeight:1.8}}>
              <div>当前登录用户：<span style={{color:'#fff'}}>{user.display_name || user.username}</span></div>
              <div>角色：<span style={{color:'var(--accent)'}}>{roleLabel(user.role)}</span></div>
              <div>当前提供只读用户列表，便于管理员快速核对账号与权限。新增/编辑用户可作为下一批补齐项。</div>
            </div>
            {usersError ? (
              <InlineError text={usersError} onRetry={loadUsers} />
            ) : loadingUsers ? (
              <div style={{padding:16,background:'var(--surface)',borderRadius:6,color:'var(--text-dim)',fontSize:'var(--font-sm)'}}>正在加载用户列表...</div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'var(--font-sm)',background:'var(--surface)',borderRadius:6,overflow:'hidden'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th style={thStyle}>用户名</th>
                    <th style={thStyle}>显示名</th>
                    <th style={thStyle}>角色</th>
                    <th style={thStyle}>创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.username} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={tdStrong}>{u.username}</td>
                      <td style={tdStyle}>{u.display_name || '—'}</td>
                      <td style={tdStyle}>{roleLabel(u.role)}</td>
                      <td style={tdStyle}>{u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InlineError({ text, onRetry }) {
  return (
    <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid rgba(231,76,60,0.35)',borderRadius:6,background:'rgba(231,76,60,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <div style={{color:'var(--text-dim)',fontSize:'var(--font-sm)'}}>{text}</div>
      <button onClick={onRetry}
        style={{padding:'6px 12px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,cursor:'pointer'}}>重试</button>
    </div>
  );
}

function roleLabel(role) {
  return role === 'admin' ? '管理员' : role === 'engineer' ? '工程师' : '查看者';
}

const thStyle = { textAlign:'left', padding:'10px 12px', color:'var(--text-dim)', fontWeight:500 };
const tdStyle = { padding:'10px 12px', color:'var(--text-dim)' };
const tdStrong = { padding:'10px 12px', color:'#fff', fontWeight:600 };
