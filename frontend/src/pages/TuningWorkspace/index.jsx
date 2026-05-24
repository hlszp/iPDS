import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { api } from '../../api/client';

export default function TuningWorkspace() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [method, setMethod] = useState('imc');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [excInfo, setExcInfo] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    api.getExcitation(tagName)
      .then(d => setExcInfo(d))
      .catch(() => {});
  }, [tagName]);

  const runTuning = async () => {
    setLoading(true);
    try {
      const res = await api.runTuning(tagName, method, null);
      setResult(res);
      setTimeout(() => drawSimulation(res.step_response), 100);
    } finally {
      setLoading(false);
    }
  };

  const drawSimulation = (step) => {
    if (!chartRef.current || !step) return;
    const chart = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    chart.setOption({
      backgroundColor: 'transparent', grid: { top: 10, right: 20, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: step.time.filter((_, i) => i % 10 === 0).map(v => `${v.toFixed(0)}s`),
        axisLine: { lineStyle: { color: '#253545' } },
        axisLabel: { color: '#708090', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#253545' } },
        axisLabel: { color: '#708090', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        { name: 'SP', type: 'line', data: step.sp.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: '#f0a030', width: 2, type: 'dashed' }, symbol: 'none' },
        { name: 'PV(仿真)', type: 'line', data: step.pv.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: '#3498db', width: 2 }, symbol: 'none' },
        { name: 'OP', type: 'line', data: step.op.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: '#2ecc71', width: 1.5 }, symbol: 'none' },
      ],
      legend: { top: 5, right: 0, textStyle: { color: '#d0d8e0', fontSize: 11 } },
    });
  };

  const confidenceTone = result?.simulation_result?.confidence_level === 'high'
    ? { color: 'var(--green)', label: '高' }
    : result?.simulation_result?.confidence_level === 'medium'
      ? { color: 'var(--accent)', label: '中' }
      : { color: 'var(--red)', label: '低' };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
        <button onClick={()=>nav(`/loop/${tagName}`)} style={{background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',padding:'4px 12px',borderRadius:4,fontSize:'var(--font-sm)'}}>← 返回详情</button>
        <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>{tagName} · PID 整定工作台</h2>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'340px 1fr',gap:12,padding:12,overflow:'auto'}}>
        <div style={{background:'var(--surface)',borderRadius:6,padding:16,display:'flex',flexDirection:'column',gap:12,overflow:'auto'}}>
          {excInfo && (
            <div style={{padding:'8px 12px',borderRadius:4,fontSize:'var(--font-sm)',background:excInfo.excitation_sufficient ? 'rgba(46,204,113,0.1)' : 'rgba(241,196,15,0.1)',border:excInfo.excitation_sufficient ? '1px solid rgba(46,204,113,0.3)' : '1px solid rgba(241,196,15,0.3)'}}>
              <div style={{color:excInfo.excitation_sufficient ? 'var(--green)' : 'var(--yellow)',fontWeight:600}}>
                {excInfo.excitation_sufficient ? '✓ 激励充足' : '⚠ 激励不足'}
              </div>
              <div style={{color:'var(--text-dim)',marginTop:2}}>{excInfo.message}</div>
            </div>
          )}

          <h3 style={{color:'#fff',fontSize:'var(--font-md)'}}>整定方法</h3>
          {[{k:'imc',l:'IMC 标准整定'},{k:'lambda',l:'Lambda 保守整定'},{k:'aggressive',l:'IMC 激进整定'}].map(m => (
            <label key={m.k} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'8px 12px',borderRadius:4,background:method===m.k?'rgba(240,160,48,0.1)':'rgba(255,255,255,0.02)',border:method===m.k?'1px solid var(--accent)':'1px solid transparent'}}>
              <input type="radio" name="method" checked={method===m.k} onChange={()=>setMethod(m.k)} />
              <span style={{fontSize:'var(--font-md)'}}>{m.l}</span>
            </label>
          ))}
          <button onClick={runTuning} disabled={loading} style={{marginTop:8,padding:'10px',background:loading?'rgba(240,160,48,0.5)':'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)',cursor:loading?'wait':'pointer'}}>
            {loading ? '计算中...' : '计算 PID 参数'}
          </button>

          {result && (
            <>
              <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
                <div style={{color:'var(--text-dim)'}}>辨识模型 ({result.identification?.best_model?.method || 'unknown'})</div>
                {result.identification?.best_model ? (
                  <>
                    <div style={{color:'#fff'}}>K = {result.identification.best_model.gain.toFixed(3)}</div>
                    <div style={{color:'#fff'}}>τ = {result.identification.best_model.tau.toFixed(1)}s &nbsp;|&nbsp; θ = {result.identification.best_model.dead_time.toFixed(1)}s</div>
                    <div style={{color:'var(--text-dim)'}}>R² = {result.identification.best_model.r_squared.toFixed(3)} &nbsp;|&nbsp; 激励指数 = {result.identification.best_model.excitation_index.toFixed(3)}</div>
                  </>
                ) : (
                  <div style={{color:'var(--text-dim)'}}>无可用模型</div>
                )}
                {result.identification?.fallback_reason && (
                  <div style={{color:'var(--yellow)',marginTop:2}}>回退原因：{result.identification.fallback_reason}</div>
                )}
                <div style={{marginTop:8,padding:'8px 10px',borderRadius:4,background:'rgba(255,255,255,0.02)'}}>
                  <div style={{color:'#fff',fontWeight:600,marginBottom:4}}>模型证据</div>
                  <div style={{color:'var(--text-dim)'}}>R² 反映模型对历史响应的拟合度；激励指数反映当前数据是否足够支撑闭环辨识。R² 越高、激励越充分，整定建议越可信。</div>
                </div>
              </div>

              <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
                <div style={{color:'var(--text-dim)'}}>整定结果 ({result.pid_params?.method})</div>
                <div style={{color:'#fff',fontSize:'var(--font-lg)',fontWeight:700}}>Kc = {result.pid_params?.Kc.toFixed(3)}</div>
                <div>Ti = {result.pid_params?.Ti.toFixed(1)}s &nbsp;|&nbsp; Td = {result.pid_params?.Td.toFixed(1)}s</div>
                <div style={{color:'var(--text-dim)'}}>闭环时间常数: {result.pid_params?.closed_loop_tau.toFixed(1)}s</div>
                <div style={{marginTop:8,padding:'8px 10px',borderRadius:4,background:'rgba(255,255,255,0.02)'}}>
                  <div style={{color:'#fff',fontWeight:600,marginBottom:4}}>参数解释</div>
                  <div style={{color:'var(--text-dim)'}}>Kc 决定调节强度，Ti 决定积分纠偏速度，Td 用于抑制快速变化。当前方法会结合辨识模型和目标闭环速度给出推荐值。</div>
                </div>
              </div>

              {result.simulation_result && (
                <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
                  <div style={{color:'var(--text-dim)'}}>仿真分析</div>
                  <div style={{color:'#fff'}}>调节时间: {result.simulation_result.settling_time.toFixed(0)}s</div>
                  <div style={{color:'#fff'}}>超调量: {result.simulation_result.overshoot_pct.toFixed(1)}%</div>
                  <div style={{color:'#fff'}}>稳态误差: {result.simulation_result.steady_state_error.toFixed(2)}%</div>
                  <div style={{color:'#fff'}}>增益裕度: {result.simulation_result.gain_margin_db.toFixed(1)} dB &nbsp;|&nbsp; 相位裕度: {result.simulation_result.phase_margin_deg.toFixed(1)}°</div>
                  <div style={{marginTop:8,color:confidenceTone.color}}>
                    置信度: {result.simulation_result.confidence_score.toFixed(0)} ({confidenceTone.label})
                  </div>
                  <div style={{marginTop:8,padding:'8px 10px',borderRadius:4,background:'rgba(255,255,255,0.02)'}}>
                    <div style={{color:'#fff',fontWeight:600,marginBottom:4}}>可信度依据</div>
                    <div style={{color:'var(--text-dim)'}}>系统综合超调量、调节时间、稳态误差、增益裕度和相位裕度评估推荐参数是否稳健。高置信度表示模型拟合和闭环表现都较好；中低置信度表示现场投用前应更谨慎复核。</div>
                  </div>
                  <div style={{color:'var(--text-dim)',marginTop:6}}>{result.simulation_result.recommendation}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{background:'var(--surface)',borderRadius:6,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',color:'#fff',fontWeight:600,fontSize:'var(--font-md)'}}>闭环仿真预览</div>
          <div ref={chartRef} style={{flex:1,minHeight:240}} />
        </div>
      </div>
    </div>
  );
}
