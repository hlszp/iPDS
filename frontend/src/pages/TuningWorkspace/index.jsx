import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { echarts } from '../../lib/echarts-line';
import { api } from '../../api/client';
import {
  BackAction,
  ChartPanel,
  Panel,
  PrimaryAction,
  StateBlock,
  StatusBanner,
} from '../../components/ui';

const METHODS = [
  { key: 'imc', label: 'IMC 标准整定', detail: '平衡响应速度与稳健性，适合大多数常规回路。' },
  { key: 'lambda', label: 'Lambda 保守整定', detail: '优先平稳与安全裕度，适合现场希望先稳住的对象。' },
  { key: 'aggressive', label: 'IMC 激进整定', detail: '优先更快响应，适合模型质量高且允许更积极调节的对象。' },
];

export default function TuningWorkspace() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [method, setMethod] = useState('imc');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [excInfo, setExcInfo] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    api.getExcitation(tagName)
      .then((d) => setExcInfo(d))
      .catch(() => {});
  }, [tagName]);

  useEffect(() => {
    if (!chartRef.current || !result?.step_response) return;
    const chart = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const step = result.step_response;
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 16, right: 24, bottom: 30, left: 42 },
      xAxis: {
        type: 'category',
        data: step.time.filter((_, i) => i % 10 === 0).map((v) => `${v.toFixed(0)}s`),
        axisLine: { lineStyle: { color: 'var(--chart-axis)' } },
        axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'var(--chart-axis)' } },
        axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'var(--chart-grid)' } },
      },
      series: [
        { name: 'SP', type: 'line', data: step.sp.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: 'var(--chart-sp)', width: 2, type: 'dashed' }, symbol: 'none' },
        { name: 'PV(仿真)', type: 'line', data: step.pv.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: 'var(--chart-pv)', width: 2 }, symbol: 'none' },
        { name: 'OP', type: 'line', data: step.op.filter((_, i) => i % 10 === 0), smooth: true, lineStyle: { color: 'var(--chart-op)', width: 1.5 }, symbol: 'none' },
      ],
      legend: { top: 0, right: 0, textStyle: { color: 'var(--text-secondary)', fontSize: 11 } },
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [result]);

  const runTuning = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.runTuning(tagName, method, null);
      setResult(res);
    } catch (e) {
      setResult(null);
      setError(e.message || '整定计算失败');
    } finally {
      setLoading(false);
    }
  };

  const confidenceTone = result?.simulation_result?.confidence_level === 'high'
    ? { tone: 'ok', label: '高' }
    : result?.simulation_result?.confidence_level === 'medium'
      ? { tone: 'neutral', label: '中' }
      : { tone: 'warn', label: '低' };

  return (
    <div className="ui-stack">
      <Panel
        title={`${tagName} · PID 整定工作台`}
        subtitle="先确认模型与激励可信度，再看参数建议和仿真风险，最后决定是否适合投用。"
        actions={(
          <>
            <BackAction onClick={() => nav(`/loop/${tagName}`)}>返回详情</BackAction>
            <PrimaryAction onClick={runTuning} disabled={loading}>{loading ? '计算中...' : '计算 PID 参数'}</PrimaryAction>
          </>
        )}
      >
        {excInfo ? (
          <StatusBanner
            tone={excInfo.excitation_sufficient ? 'ok' : 'warn'}
            items={[{ label: '激励条件', value: excInfo.excitation_sufficient ? '充足' : '不足' }]}
            detail={excInfo.message}
          />
        ) : null}
      </Panel>

      <div className="ui-shell-grid ui-shell-grid--aside">
        <div className="ui-stack">
          <Panel title="整定方法" subtitle="按现场目标选择更平衡、更保守或更积极的参数策略。">
            <div className="ui-radio-list">
              {METHODS.map((item) => (
                <label key={item.key} className={`ui-radio-card ${method === item.key ? 'is-active' : ''}`}>
                  <input type="radio" name="method" checked={method === item.key} onChange={() => setMethod(item.key)} />
                  <span className="ui-radio-card__body">
                    <span className="ui-radio-card__title">{item.label}</span>
                    <span className="ui-radio-card__detail">{item.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="模型可信度" subtitle="没有可信模型时，不要急着看参数值。">
            {error ? (
              <StateBlock type="error" title="整定计算失败" detail={error} />
            ) : !result ? (
              <StateBlock type="empty" title="尚未生成整定结果" detail="先选择策略并计算 PID 参数，系统才会输出模型与仿真结论。" />
            ) : (
              <div className="ui-stack">
                <div className="ui-callout">
                  辨识模型：{result.identification?.best_model?.method || 'unknown'}
                  {result.identification?.fallback_reason ? ` ｜ 回退原因：${result.identification.fallback_reason}` : ''}
                </div>
                {result.identification?.best_model ? (
                  <div className="ui-key-value">
                    <div>K = <strong>{result.identification.best_model.gain.toFixed(3)}</strong></div>
                    <div>τ = <strong>{result.identification.best_model.tau.toFixed(1)}s</strong> · θ = <strong>{result.identification.best_model.dead_time.toFixed(1)}s</strong></div>
                    <div>R² = <strong>{result.identification.best_model.r_squared.toFixed(3)}</strong> · 激励指数 = <strong>{result.identification.best_model.excitation_index.toFixed(3)}</strong></div>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel title="参数建议" subtitle="参数只是建议值，是否可投用要结合仿真风险一起判断。">
            {error ? (
              <StateBlock type="error" title="暂无参数建议" detail="当前请求没有返回有效整定结果，请先解决接口错误或检查回路数据。" />
            ) : !result ? (
              <StateBlock type="empty" title="暂无参数建议" detail="计算完成后，这里会展示 Kc、Ti、Td 及闭环时间常数。" />
            ) : (
              <div className="ui-key-value">
                <div>Kc = <strong>{result.pid_params?.Kc.toFixed(3)}</strong></div>
                <div>Ti = <strong>{result.pid_params?.Ti.toFixed(1)}s</strong> · Td = <strong>{result.pid_params?.Td.toFixed(1)}s</strong></div>
                <div>闭环时间常数 = <strong>{result.pid_params?.closed_loop_tau.toFixed(1)}s</strong></div>
              </div>
            )}
          </Panel>

          {result?.simulation_result ? (
            <Panel title="投用建议" subtitle="用仿真结果判断这组参数是否适合现场实施。">
              <div className="ui-stack">
                <StatusBanner
                  tone={confidenceTone.tone}
                  items={[{ label: '置信度', value: `${result.simulation_result.confidence_score.toFixed(0)} (${confidenceTone.label})` }]}
                  detail={result.simulation_result.recommendation}
                />
                <div className="ui-key-value">
                  <div>调节时间: <strong>{result.simulation_result.settling_time.toFixed(0)}s</strong></div>
                  <div>超调量: <strong>{result.simulation_result.overshoot_pct.toFixed(1)}%</strong> · 稳态误差: <strong>{result.simulation_result.steady_state_error.toFixed(2)}%</strong></div>
                  <div>增益裕度: <strong>{result.simulation_result.gain_margin_db.toFixed(1)} dB</strong> · 相位裕度: <strong>{result.simulation_result.phase_margin_deg.toFixed(1)}°</strong></div>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>

        <ChartPanel
          title="闭环仿真预览"
          subtitle="把参数建议转成可感知的趋势变化，再决定是否投用。"
          state={error ? <StateBlock type="error" title="暂无仿真图" detail="接口当前返回错误，暂时无法生成闭环仿真。" /> : !result ? <StateBlock type="empty" title="暂无仿真图" detail="计算完成后，这里会展示 SP / PV / OP 的闭环响应。" /> : null}
        >
          {result ? <div ref={chartRef} style={{ flex: 1, minHeight: 320 }} /> : null}
        </ChartPanel>
      </div>
    </div>
  );
}
