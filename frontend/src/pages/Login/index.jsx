import { useState } from 'react';
import { api } from '../../api/client';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.login(username, password);
      onLogin(data.access_token, { username: data.username, role: data.role, display_name: data.display_name });
    } catch {
      setError('用户名或密码错误');
    }
  };

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',width:'100%',background:'var(--bg)'}}>
      <form onSubmit={submit} style={{background:'var(--surface)',padding:40,borderRadius:8,width:380,border:'1px solid var(--border)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)',display:'inline-block',marginBottom:12}} />
          <h1 style={{color:'#fff',fontSize:20}}>PDS 驾驶舱</h1>
          <p style={{color:'var(--text-dim)',fontSize:'var(--font-sm)',marginTop:4}}>PID性能评估与整定系统</p>
        </div>
        {error && <div style={{background:'rgba(231,76,60,0.15)',color:'var(--red)',padding:'8px 12px',borderRadius:4,marginBottom:16,fontSize:'var(--font-sm)'}}>{error}</div>}
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="用户名" style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',borderRadius:4,color:'#fff',marginBottom:12,outline:'none'}} />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="密码" style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',borderRadius:4,color:'#fff',marginBottom:20,outline:'none'}} />
        <button type="submit" style={{width:'100%',padding:'12px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:700,fontSize:'var(--font-md)'}}>登 录</button>
      </form>
    </div>
  );
}
