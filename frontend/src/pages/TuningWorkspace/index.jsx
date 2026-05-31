import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect, useRef } from 'react';
import { echarts } from '../../lib/echarts-line';
import { api } from '../../api/client';
import {
  BackAction,
  ChartPanel,
  DataHero,
  Panel,
  PrimaryAction,
  SectionCaption,
  StateBlock,
  StatusBanner,
  WorkbenchRail,
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

  const resultHighlights = useMemo(() => {
    if (!result?.simulation_result || !result?.pid_params) return [];
    return [
      {
        label: '调节时间',
        value: `${result.simulation_result.settling_time.toFixed(0)}s`,
        detail: result.simulation_result.settling_time <= 180 ? '满足快速收敛' : '仍偏慢，注意负荷切换响应',
      },
      {
        label: '超调量',
        value: `${result.simulation_result.overshoot_pct.toFixed(1)}%`,
        detail: result.simulation_result.overshoot_pct <= 10 ? '冲击受控' : '注意投用瞬态冲击',
      },
      {
        label: '参数组合',
        value: `Kc ${result.pid_params.Kc.toFixed(2)} / Ti ${result.pid_params.Ti.toFixed(0)}s`,
        detail: `Td ${result.pid_params.Td.toFixed(1)}s · τc ${result.pid_params.closed_loop_tau.toFixed(0)}s`,
      },
    ];
  }, [result]);

  return (
    <div className="ui-stack">
      <DataHero
        title={`${tagName} · PID 整定工作台`}
        subtitle="把方法选择、模型证据、参数建议和闭环仿真整合到同一张工程工作台里，减少空白等待感。"
        aside={(
          <div className="ui-stack">
            <SectionCaption
              kicker="执行动作"
              title={METHODS.find((item) => item.key === method)?.label || '整定方法'}
              detail={loading ? '正在计算 PID 参数与闭环仿真结果。' : '确认激励状态后可直接执行整定。'}
              actions={(
                <>
                  <BackAction onClick={() => nav(`/loop/${tagName}`)}>返回详情</BackAction>
                  <PrimaryAction onClick={runTuning} disabled={loading}>{loading ? '计算中...' : '计算 PID 参数'}</PrimaryAction>
                </>
              )}
            />
          </div>
        )}
      >
        <StatusBanner
          tone={excInfo?.excitation_sufficient ? 'ok' : 'warn'}
          items={[
            { label: '激励条件', value: excInfo?.excitation_sufficient ? '充足' : '待确认' },
            { label: '当前方法', value: METHODS.find((item) => item.key === method)?.label || '—' },
            { label: '工作状态', value: loading ? '计算中' : result ? '已生成结果' : '待执行' },
          ]}
          detail={excInfo?.message || '正在读取激励信息，确认后即可执行整定。'}
        />
      </DataHero>

      <div className="ui-shell-grid ui-shell-grid--aside">
        <WorkbenchRail title="方法与结果摘要" subtitle="左侧保留方法选择与证据摘要，右侧固定展示主仿真工作区。">
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
              <StateBlock type="empty" title="等待整定结果" detail="执行计算后，系统会在这里展示辨识模型、拟合质量与激励指数。" />
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
              <StateBlock type="empty" title="等待参数输出" detail="计算完成后，这里会展示 Kc、Ti、Td 及闭环时间常数。" />
            ) : (
              <div className="ui-key-value">
                <div>Kc = <strong>{result.pid_params?.Kc.toFixed(3)}</strong></div>
                <div>Ti = <strong>{result.pid_params?.Ti.toFixed(1)}s</strong> · Td = <strong>{result.pid_params?.Td.toFixed(1)}s</strong></div>
                <div>闭环时间常数 = <strong>{result.pid_params?.closed_loop_tau.toFixed(1)}s</strong></div>
              </div>
            )}
          </Panel>

          {!result ? (
            <Panel title="投用前检查" subtitle="先确认约束与预期，再进入仿真判读。">
              <div className="ui-key-value">
                <div>当前方法：<strong>{METHODS.find((item) => item.key === method)?.label || '—'}</strong></div>
                <div>激励状态：<strong>{excInfo?.excitation_sufficient ? '可直接计算' : '建议先复核'}</strong></div>
                <div>输出顺序：<strong>模型 → 参数 → 仿真 → 投用建议</strong></div>
              </div>
            </Panel>
          ) : null}

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
        </WorkbenchRail>

        <ChartPanel
          title="闭环仿真主工作区"
          subtitle="右侧始终保留主画布。未运行前说明将显示什么，运行后直接进入结果判读。"
          minHeight={520}
          state={error ? <StateBlock type="error" title="闭环仿真生成失败" detail="接口当前返回错误，暂时无法生成闭环仿真，请先检查数据与后端状态。" /> : !result ? <div className="ui-sim-placeholder"><div className="ui-sim-placeholder__headline">等待仿真结果</div><div className="ui-sim-placeholder__detail">执行计算后，这里会显示 SP / PV / OP 的闭环响应，以及是否适合现场投用的主判断依据。</div><div className="ui-sim-placeholder__legend"><span>SP · 目标</span><span>PV · 过程响应</span><span>OP · 阀位输出</span><span>先看超调与调节时间</span></div></div> : null}
        >
          {result ? (
            <>
              <div className="ui-shell-grid ui-shell-grid--two" style={{ padding: '14px 16px 0' }}>
                {resultHighlights.map((item) => (
                  <div key={item.label} className="ui-stat-card">
                    <div className="ui-stat-card__label">{item.label}</div>
                    <div className="ui-stat-card__value">{item.value}</div>
                    <div className="ui-stat-card__detail">{item.detail}</div>
                  </div>
                ))}
              </div>
              <div ref={chartRef} style={{ flex: 1, minHeight: 420 }} />
              <div className="ui-shell-grid ui-shell-grid--two" style={{ padding: '0 16px 16px' }}>
                <div className="ui-callout">
                  主判读：先看 PV 是否在可接受时间内贴近 SP，再看 OP 是否出现过度拉扯。若超调偏大且 OP 波动强，优先回退到更保守方法。
                </div>
                <div className="ui-callout">
                  现场建议：若模型回退或置信度不高，先小步试投并观察阀位与负荷扰动，再决定是否直接全量替换当前参数。
                </div>
              </div>
            </>
          ) : null}
        </ChartPanel>
      </div>
    </div>
  );
}
