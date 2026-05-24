import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { api } from '../../api/client';

export default function LoopDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getLoopDetail(tagName)
      .then(d => setData(d))
      .catch(() => setError(true));
  }, [tagName]);

  if (error) return <div style={{padding:40,color:'var(--text-dim)'}}>回路数据加载失败</div>;
  if (!data) return <div style={{padding:40,color:'var(--text-dim)'}}>加载中...</div>;

  const info = data.loop_info || {};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
        <button onClick={()=>nav('/')} style={{background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',padding:'4px 12px',borderRadius:4,fontSize:'var(--font-sm)'}}>← 返回驾驶舱</button>
        <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>{tagName}</h2>
        <span style={{color:'var(--text-dim)'}}>{info.unit} · {info.description || info.loop_type}</span>
        <button onClick={()=>nav(`/loop/${tagName}/tuning`)} style={{marginLeft:'auto',padding:'8px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)'}}>PID 整定</button>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'auto 1fr',gap:12,padding:12,overflow:'auto'}}>
        <KpiCards assessment={data.assessment} />
        <DiagnosisCard diagnosis={data.diagnosis} />
        <TrendPanel trend={data.trend} tagName={tagName} />
        <InfoPanel info={info} />
      </div>
    </div>
  );
}

function KpiCards({ assessment }) {
  const a = assessment || {};
  const gradeColor = a.grade === '优' ? 'var(--green)' : a.grade === '良' ? 'var(--blue)' : a.grade === '中' ? 'var(--yellow)' : a.grade === '差' ? 'var(--red)' : 'var(--text-dim)';
  const items = [
    { l: '自控率', v: a.self_control_rate != null ? `${a.self_control_rate.toFixed(1)}%` : '—', c: (a.self_control_rate || 0) >= 95 ? 'var(--green)' : 'var(--yellow)' },
    { l: '平稳率', v: a.stability_rate != null ? `${a.stability_rate.toFixed(1)}%` : '—', c: (a.stability_rate || 0) >= 95 ? 'var(--green)' : 'var(--yellow)' },
    { l: '性能评分', v: a.performance_score != null ? a.performance_score.toFixed(1) : '—', c: 'var(--accent)' },
    { l: '评级', v: a.grade || '—', c: gradeColor },
  ];
  return (
    <div style={{display:'flex',gap:12}}>
      {items.map(k => (
        <div key={k.l} style={{flex:1,background:'var(--surface)',borderRadius:6,padding:'14px 18px'}}>
          <div style={{fontSize:'var(--font-sm)',color:'var(--text-dim)',marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:28,fontWeight:700,color:k.c}}>{k.v}</div>
        </div>
      ))}
    </div>
  );
}

function DiagnosisCard({ diagnosis }) {
  const d = diagnosis || {};
  const items = [
    { l: '阀门粘滞', v: d.stiction_detected ? `检测到 (${(d.stiction_confidence * 100).toFixed(0)}%)` : '未检测', c: d.stiction_detected ? 'var(--red)' : 'var(--green)' },
    { l: '振荡', v: d.oscillation_detected ? (d.oscillation_period ? `周期 ${d.oscillation_period.toFixed(1)}s` : '检测到') : '未检测', c: d.oscillation_detected ? 'var(--red)' : 'var(--green)' },
    { l: '非线性度', v: d.nonlinearity_degree != null ? d.nonlinearity_degree.toFixed(3) : '—', c: d.nonlinearity_detected ? 'var(--red)' : 'var(--green)' },
    { l: '回路耦合', v: (d.coupling_candidates && d.coupling_candidates.length > 0) ? d.coupling_candidates.join(', ') : '无', c: (d.coupling_candidates && d.coupling_candidates.length > 0) ? 'var(--red)' : 'var(--green)' },
  ];
  return (
    <div style={{background:'var(--surface)',borderRadius:6,padding:16}}>
      <h3 style={{color:'#fff',fontSize:'var(--font-md)',marginBottom:12}}>故障诊断</h3>
      {d.primary_fault && d.primary_fault !== 'none' && (
        <div style={{marginBottom:10,padding:'6px 10px',background:'rgba(231,76,60,0.15)',borderRadius:4,fontSize:'var(--font-sm)',color:'var(--red)'}}>
          主要故障: {d.primary_fault === 'stiction' ? '阀门粘滞' : d.primary_fault === 'oscillation' ? '振荡' : d.primary_fault === 'nonlinearity' ? '非线性' : d.primary_fault === 'coupling' ? '回路耦合' : d.primary_fault}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:'var(--font-sm)'}}>
        {items.map(item => (
          <div key={item.l} style={{display:'flex',justifyContent:'space-between',padding:'6px 8px',background:'rgba(255,255,255,0.02)',borderRadius:4}}>
            <span style={{color:'var(--text-dim)'}}>{item.l}</span>
            <span style={{color:item.c,fontWeight:600}}>{item.v}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,padding:'8px 10px',background:'rgba(255,255,255,0.02)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:1.8,color:'var(--text-dim)'}}>
        诊断结果按粘滞、振荡、非线性和耦合四类特征综合排序。置信度越高，代表当前趋势数据越符合该类故障特征；耦合项用于提示可能需要联合排查相关回路。
      </div>
    </div>
  );
}

function TrendPanel({ trend, tagName }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !trend) return;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });

    const step = Math.max(1, Math.floor(trend.time.length / 200));
    const labels = trend.time.filter((_, i) => i % step === 0).map(v => {
      const m = Math.floor(v / 60);
      const s = v % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    });
    const pv = trend.pv.filter((_, i) => i % step === 0);
    const sp = trend.sp.filter((_, i) => i % step === 0);
    const op = trend.op.filter((_, i) => i % step === 0);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, right: 60, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#253545' } }, axisLabel: { color: '#708090', fontSize: 10 } },
      yAxis: [
        { type: 'value', axisLine: { lineStyle: { color: '#253545' } }, axisLabel: { color: '#708090', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
        { type: 'value', min: 0, max: 100, axisLine: { lineStyle: { color: '#253545' } }, axisLabel: { color: '#708090', fontSize: 10 } },
      ],
      series: [
        { name: 'PV', type: 'line', data: pv, smooth: true, lineStyle: { color: '#3498db', width: 2 }, symbol: 'none' },
        { name: 'SP', type: 'line', data: sp, smooth: true, lineStyle: { color: '#f0a030', width: 2, type: 'dashed' }, symbol: 'none' },
        { name: 'OP', type: 'line', yAxisIndex: 1, data: op, smooth: true, lineStyle: { color: '#2ecc71', width: 1.5 }, symbol: 'none' },
      ],
      legend: { top: 5, right: 0, textStyle: { color: '#d0d8e0', fontSize: 11 } },
    });
    return () => chart.dispose();
  }, [trend, tagName]);

  return (
    <div style={{background:'var(--surface)',borderRadius:6,display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',color:'#fff',fontWeight:600,fontSize:'var(--font-md)'}}>趋势图（近3小时）</div>
      <div ref={ref} style={{flex:1,minHeight:240}} />
    </div>
  );
}

function InfoPanel({ info }) {
  return (
    <div style={{background:'var(--surface)',borderRadius:6,padding:16}}>
      <h3 style={{color:'#fff',fontSize:'var(--font-md)',marginBottom:12}}>回路信息</h3>
      <div style={{fontSize:'var(--font-sm)',lineHeight:2.2,color:'var(--text-dim)'}}>
        <div>位号: <span style={{color:'#fff'}}>{info.tag_name || '—'}</span></div>
        <div>装置: {info.unit || '—'}{info.sub_unit ? ` / ${info.sub_unit}` : ''}</div>
        <div>描述: {info.description || '—'}</div>
        <div>PV位号: {info.pv_tag || '—'} | SP位号: {info.sp_tag || '—'} | OP位号: {info.op_tag || '—'}</div>
        <div>量程: {info.pv_lo != null && info.pv_hi != null ? `${info.pv_lo}–${info.pv_hi} ${info.eng_unit || ''}` : '—'} |
            采样周期: {info.sample_interval || '—'}s |
            死区时间: {info.dead_time_typical != null ? `~${info.dead_time_typical}s` : '—'}</div>
      </div>
    </div>
  );
}
