import { useMemo, useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { api } from '../../api/client';

export default function LoopDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setData(null);
    api.getLoopDetail(tagName)
      .then((d) => setData(d))
      .catch(() => setError(true));
  }, [tagName]);

  if (error) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>回路数据加载失败</div>;
  if (!data) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>加载中...</div>;

  const info = data.loop_info || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={() => nav('/')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '4px 12px', borderRadius: 4, fontSize: 'var(--font-sm)' }}>← 返回驾驶舱</button>
        <h2 style={{ color: '#fff', fontSize: 'var(--font-lg)' }}>{tagName}</h2>
        <span style={{ color: 'var(--text-dim)' }}>{info.unit} · {info.description || info.loop_type}</span>
        <button onClick={() => nav(`/loop/${tagName}/tuning`)} style={{ marginLeft: 'auto', padding: '8px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 'var(--font-md)' }}>PID 整定</button>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: 12, padding: 12, overflow: 'auto' }}>
        <KpiCards assessment={data.assessment} />
        <DiagnosisCard diagnosis={data.diagnosis} />
        <TrendPanel trend={data.trend} title="趋势图（近3小时）" />
        <InfoPanel info={info} />
        <HistoryPlaybackPanel tagName={tagName} />
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
    <div style={{ display: 'flex', gap: 12 }}>
      {items.map((item) => (
        <div key={item.l} style={{ flex: 1, background: 'var(--surface)', borderRadius: 6, padding: '14px 18px' }}>
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: 4 }}>{item.l}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: item.c }}>{item.v}</div>
        </div>
      ))}
    </div>
  );
}

function DiagnosisCard({ diagnosis }) {
  const suggestionCards = useMemo(() => buildDiagnosisCards(diagnosis || {}), [diagnosis]);
  const primary = suggestionCards.find((item) => item.active);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 6, padding: 16 }}>
      <h3 style={{ color: '#fff', fontSize: 'var(--font-md)', marginBottom: 12 }}>故障诊断</h3>
      {primary && (
        <div style={{ marginBottom: 10, padding: '6px 10px', background: 'rgba(231,76,60,0.15)', borderRadius: 4, fontSize: 'var(--font-sm)', color: 'var(--red)' }}>
          优先处理: {primary.title}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {suggestionCards.map((item) => (
          <div key={item.key} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: `1px solid ${item.active ? 'rgba(231,76,60,0.3)' : 'rgba(255,255,255,0.04)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{item.title}</span>
              <span style={{ color: item.active ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{item.summary}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)', lineHeight: 1.7 }}>可能原因：{item.reason}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)', lineHeight: 1.7 }}>优化建议：{item.advice}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildDiagnosisCards(d) {
  return [
    {
      key: 'stiction',
      title: '阀门粘滞',
      active: !!d.stiction_detected,
      summary: d.stiction_detected ? `检测到 (${((d.stiction_confidence || 0) * 100).toFixed(0)}%)` : '未检测',
      reason: d.stiction_detected ? '阀位动作存在卡涩或摩擦死区，控制器输出变化后 PV 跟随不连续。' : '当前数据中没有明显的阀门卡涩迹象。',
      advice: d.stiction_detected ? '先核查定位器、执行机构和阀杆摩擦，再评估是否需要减小积分强度避免来回顶阀。' : '保持现有阀门点检周期，重点监视检修后趋势是否变化。',
    },
    {
      key: 'oscillation',
      title: '振荡',
      active: !!d.oscillation_detected,
      summary: d.oscillation_detected ? (d.oscillation_period ? `周期 ${d.oscillation_period.toFixed(1)}s` : '检测到') : '未检测',
      reason: d.oscillation_detected ? '回路响应呈周期性往复，常见于积分过强、阀门迟滞或上下游扰动传递。' : '当前趋势未见明显周期性波动。',
      advice: d.oscillation_detected ? '优先检查积分时间和阀门回差，若周期与上游负荷一致，再联动排查相关回路。' : '维持现参数，关注负荷切换时是否出现新的周期波动。',
    },
    {
      key: 'nonlinearity',
      title: '非线性度',
      active: !!d.nonlinearity_detected,
      summary: d.nonlinearity_degree != null ? d.nonlinearity_degree.toFixed(3) : '—',
      reason: d.nonlinearity_detected ? '不同工况下增益变化较大，单组 PID 参数难以覆盖全量程。' : '当前工况下过程增益变化不明显。',
      advice: d.nonlinearity_detected ? '按负荷分段整定或缩小常用操作区间，必要时引入增益调度。' : '继续沿用当前参数，后续在高低负荷点分别复核一次。',
    },
    {
      key: 'coupling',
      title: '回路耦合',
      active: !!(d.coupling_candidates && d.coupling_candidates.length > 0),
      summary: d.coupling_candidates && d.coupling_candidates.length > 0 ? d.coupling_candidates.join(', ') : '无',
      reason: d.coupling_candidates && d.coupling_candidates.length > 0 ? '多个相关回路可能同时影响当前 PV，单回路整定后效果会被相互作用抵消。' : '暂无明显的强耦合对象。',
      advice: d.coupling_candidates && d.coupling_candidates.length > 0 ? '先确认上下游主导回路，再按主回路→从回路顺序整定，避免同时改多个参数。' : '可以按单回路方式继续诊断和整定。',
    },
  ];
}

function HistoryPlaybackPanel({ tagName }) {
  const [hours, setHours] = useState(24);
  const [playbackStep, setPlaybackStep] = useState(5);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getLoopHistory(tagName, { hours, playback_step: playbackStep })
      .then((res) => {
        if (!active) return;
        setHistory(res);
      })
      .catch((e) => {
        if (!active) return;
        setHistory(null);
        setError(e.message || '历史趋势加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tagName, hours, playbackStep]);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 6, display: 'flex', flexDirection: 'column', gridColumn: '1 / span 2' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 'var(--font-md)' }}>历史趋势查询与回放</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--text-dim)', fontSize: 'var(--font-sm)' }}>
          <label>时间范围
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ marginLeft: 6, padding: '4px 8px', background: 'var(--surface-2, #18222d)', color: '#fff', border: '1px solid var(--border)', borderRadius: 4 }}>
              {[3, 6, 12, 24, 48, 72].map((v) => <option key={v} value={v}>{v}h</option>)}
            </select>
          </label>
          <label>回放步长
            <select value={playbackStep} onChange={(e) => setPlaybackStep(Number(e.target.value))} style={{ marginLeft: 6, padding: '4px 8px', background: 'var(--surface-2, #18222d)', color: '#fff', border: '1px solid var(--border)', borderRadius: 4 }}>
              {[1, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v}s</option>)}
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>加载中...</div>
      ) : error ? (
        <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>{error}</div>
      ) : (
        <TrendPanel trend={history?.trend} title={`历史趋势（近${history?.hours || hours}小时，${history?.playback_step || playbackStep}s/步）`} />
      )}
    </div>
  );
}

function TrendPanel({ trend, title = '趋势图', height = 240 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !trend) return;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });

    const step = Math.max(1, Math.floor(trend.time.length / 200));
    const labels = trend.time.filter((_, i) => i % step === 0).map((v) => {
      const h = Math.floor(v / 3600);
      const m = Math.floor((v % 3600) / 60);
      const s = v % 60;
      return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    });
    const pv = trend.pv.filter((_, i) => i % step === 0);
    const sp = trend.sp.filter((_, i) => i % step === 0);
    const op = trend.op.filter((_, i) => i % step === 0);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, right: 60, bottom: 30, left: 50 },
      tooltip: { trigger: 'axis' },
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
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [trend]);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 6, display: 'flex', flexDirection: 'column', minHeight: height }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', color: '#fff', fontWeight: 600, fontSize: 'var(--font-md)' }}>{title}</div>
      <div ref={ref} style={{ flex: 1, minHeight: height }} />
    </div>
  );
}

function InfoPanel({ info }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 6, padding: 16 }}>
      <h3 style={{ color: '#fff', fontSize: 'var(--font-md)', marginBottom: 12 }}>回路信息</h3>
      <div style={{ fontSize: 'var(--font-sm)', lineHeight: 2.2, color: 'var(--text-dim)' }}>
        <div>位号: <span style={{ color: '#fff' }}>{info.tag_name || '—'}</span></div>
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
