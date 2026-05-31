import { useMemo, useRef, useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { echarts } from '../../lib/echarts-line';
import { api } from '../../api/client';
import {
  BackAction,
  ChartPanel,
  LoopListItem,
  MetricCard,
  PageSection,
  Panel,
  PrimaryAction,
  RetryAction,
  StateBlock,
  StatusBanner,
} from '../../components/ui';

export default function LoopDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const returnTo = location.state?.returnTo || '/assessment';
  const returnLabel = location.state?.returnLabel || '返回上一步';

  const loadDetail = () => {
    setError('');
    setData(null);
    api.getLoopDetail(tagName)
      .then((d) => setData(d))
      .catch((e) => setError(e.message || '当前无法读取该回路的诊断证据与运行趋势，请稍后重试。'));
  };

  useEffect(() => {
    loadDetail();
  }, [tagName]);

  if (error) return <StateBlock type="error" title="回路数据加载失败" detail={error} action={<RetryAction onClick={loadDetail}>重试读取</RetryAction>} />;
  if (!data) return <StateBlock type="loading" title="回路详情加载中" detail="正在汇总结论、证据链与历史趋势。" />;

  const info = data.loop_info || {};

  return (
    <div className="ui-stack">
      <Panel
        title={tagName}
        subtitle={`${info.unit || '未分配装置'} · ${info.description || info.loop_type || '单回路诊断详情'}`}
        actions={(
          <>
            <BackAction onClick={() => nav(returnTo)}>{returnLabel}</BackAction>
            <PrimaryAction onClick={() => nav(`/loop/${tagName}/tuning`, { state: { sourceTitle: '回路详情', returnLabel: '返回回路详情', returnTo: `/loop/${tagName}` } })}>进入 PID 整定</PrimaryAction>
          </>
        )}
      >
        <div className="ui-stack">
          <div className="ui-card-grid">
            <MetricCard label="自控率" value={data.assessment?.self_control_rate != null ? `${data.assessment.self_control_rate.toFixed(1)}%` : '—'} detail="当前窗口内控制器闭环投入情况" />
            <MetricCard label="平稳率" value={data.assessment?.stability_rate != null ? `${data.assessment.stability_rate.toFixed(1)}%` : '—'} detail="当前工况下波动是否受控" />
            <MetricCard label="性能评分" value={data.assessment?.performance_score != null ? data.assessment.performance_score.toFixed(1) : '—'} detail="综合评估得分" />
            <MetricCard label="当前评级" value={data.assessment?.grade || '—'} detail="用于判断后续处理优先级" />
          </div>
          <StatusBanner tone="neutral" items={[{ label: '回路位号', value: info.tag_name || '—' }, { label: '装置', value: info.unit || '—' }, { label: '采样周期', value: `${info.sample_interval || '—'}s` }]} detail="先确认对象、量程和采样条件，再解读趋势与诊断结论。" />
        </div>
      </Panel>

      <PageSection columns="sidebar">
        <div className="ui-stack">
          <DiagnosisCard diagnosis={data.diagnosis} />
          <Panel title="回路信息" subtitle="对象、量程与信号绑定。">
            <div className="ui-key-value">
              <div>位号: <strong>{info.tag_name || '—'}</strong></div>
              <div>装置: <strong>{info.unit || '—'}{info.sub_unit ? ` / ${info.sub_unit}` : ''}</strong></div>
              <div>描述: <strong>{info.description || '—'}</strong></div>
              <div>PV / SP / OP: <strong>{info.pv_tag || '—'} / {info.sp_tag || '—'} / {info.op_tag || '—'}</strong></div>
              <div>量程: <strong>{info.pv_lo != null && info.pv_hi != null ? `${info.pv_lo}–${info.pv_hi} ${info.eng_unit || ''}` : '—'}</strong></div>
              <div>采样周期: <strong>{info.sample_interval || '—'}s</strong> · 死区时间: <strong>{info.dead_time_typical != null ? `~${info.dead_time_typical}s` : '—'}</strong></div>
            </div>
          </Panel>
        </div>

        <div className="ui-stack">
          <TrendPanel trend={data.trend} title="近 3 小时趋势" />
          <HistoryPlaybackPanel tagName={tagName} />
        </div>
      </PageSection>
    </div>
  );
}

function DiagnosisCard({ diagnosis }) {
  const suggestionCards = useMemo(() => buildDiagnosisCards(diagnosis || {}), [diagnosis]);
  const primary = suggestionCards.find((item) => item.active);

  return (
    <Panel title="诊断结论" subtitle="先看最优先问题，再看原因和建议动作。">
      <div className="ui-stack">
        {primary ? <div className="ui-callout ui-callout--danger">优先处理：{primary.title}。建议先按该问题排查，再决定是否进入参数整定。</div> : null}
        <div className="ui-list">
          {suggestionCards.map((item) => (
            <LoopListItem
              key={item.key}
              title={item.title}
              meta={`可能原因：${item.reason}｜建议：${item.advice}`}
              value={item.summary}
              tone={item.active ? 'danger' : 'success'}
              secondary={!item.active}
            />
          ))}
        </div>
      </div>
    </Panel>
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
    <ChartPanel
      title="历史趋势查询与回放"
      subtitle="按时间范围和回放步长复核问题是否持续存在。"
      actions={(
        <div className="ui-filter-group">
          <select className="ui-select" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[3, 6, 12, 24, 48, 72].map((v) => <option key={v} value={v}>{v}h</option>)}
          </select>
          <select className="ui-select" value={playbackStep} onChange={(e) => setPlaybackStep(Number(e.target.value))}>
            {[1, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v}s/步</option>)}
          </select>
        </div>
      )}
      state={loading ? <StateBlock type="loading" title="历史趋势加载中" detail="正在读取持久化回放数据。" /> : error ? <StateBlock type="error" title="历史趋势加载失败" detail={error} /> : null}
    >
      {!loading && !error ? <TrendCanvas trend={history?.trend} title={`历史趋势（近${history?.hours || hours}小时，${history?.playback_step || playbackStep}s/步）`} /> : null}
    </ChartPanel>
  );
}

function TrendPanel({ trend, title }) {
  return (
    <ChartPanel title={title} subtitle="先看 PV / SP / OP 的整体关系，再判断问题是否持续。">
      <TrendCanvas trend={trend} title={title} />
    </ChartPanel>
  );
}

function TrendCanvas({ trend }) {
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

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 16, right: 24, bottom: 30, left: 42 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: 'var(--chart-axis)' } }, axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 } },
      yAxis: [
        { type: 'value', axisLine: { lineStyle: { color: 'var(--chart-axis)' } }, axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 }, splitLine: { lineStyle: { color: 'var(--chart-grid)' } } },
        { type: 'value', min: 0, max: 100, axisLine: { lineStyle: { color: 'var(--chart-axis)' } }, axisLabel: { color: 'var(--text-tertiary)', fontSize: 10 } },
      ],
      legend: { top: 0, right: 0, textStyle: { color: 'var(--text-secondary)', fontSize: 11 } },
      series: [
        { name: 'PV', type: 'line', data: trend.pv.filter((_, i) => i % step === 0), smooth: true, lineStyle: { color: 'var(--chart-pv)', width: 2 }, symbol: 'none' },
        { name: 'SP', type: 'line', data: trend.sp.filter((_, i) => i % step === 0), smooth: true, lineStyle: { color: 'var(--chart-sp)', width: 2, type: 'dashed' }, symbol: 'none' },
        { name: 'OP', type: 'line', yAxisIndex: 1, data: trend.op.filter((_, i) => i % step === 0), smooth: true, lineStyle: { color: 'var(--chart-op)', width: 1.5 }, symbol: 'none' },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [trend]);

  if (!trend) return <StateBlock type="empty" title="暂无趋势数据" detail="当前时间范围没有可展示的趋势样本。" />;
  return <div ref={ref} style={{ flex: 1, minHeight: 280 }} />;
}
