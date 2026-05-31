import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import RadarChart from './RadarChart';
import { BackAction, MetricCard, PageSection, Panel, PrimaryAction, StateBlock, StatusBanner } from '../../components/ui';

const GRADE_COLORS = { '优': 'var(--green)', '良': 'var(--blue)', '中': 'var(--yellow)', '差': 'var(--red)', '开环': 'var(--gray)' };

export default function AssessmentDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [radar, setRadar] = useState(null);
  const [sugg, setSugg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState('');
  const [radarError, setRadarError] = useState('');
  const [suggestionError, setSuggestionError] = useState('');

  const returnTo = location.state?.returnTo || '/assessment';
  const returnLabel = location.state?.returnLabel || '返回评估矩阵';

  useEffect(() => {
    if (!tagName) return;
    let active = true;
    setLoading(true);
    setDetailError('');
    setRadarError('');
    setSuggestionError('');

    Promise.allSettled([
      api.getLoopDetail(tagName),
      api.getRadar(tagName),
      api.getSuggestions(tagName),
    ]).then((results) => {
      if (!active) return;
      const [detailResult, radarResult, suggestionResult] = results;

      if (detailResult.status === 'fulfilled') {
        setData(detailResult.value);
      } else {
        setData(null);
        setDetailError(detailResult.reason?.message || '回路评估详情读取失败');
      }

      if (radarResult.status === 'fulfilled') {
        setRadar(radarResult.value);
      } else {
        setRadar(null);
        setRadarError(radarResult.reason?.message || '雷达图数据读取失败');
      }

      if (suggestionResult.status === 'fulfilled') {
        setSugg(suggestionResult.value);
      } else {
        setSugg(null);
        setSuggestionError(suggestionResult.reason?.message || '诊断建议读取失败');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [tagName]);

  const degradedItems = [radarError, suggestionError].filter(Boolean);
  const a = data?.assessment || {};
  const d = data?.diagnosis || {};
  const pv = data?.trend?.pv?.[data?.trend?.pv.length - 1];
  const sp = data?.trend?.sp?.[data?.trend?.sp.length - 1];
  const op = data?.trend?.op?.[data?.trend?.op.length - 1];

  const performanceItems = [
    ['性能评分', a.performance_score, '分'],
    ['性能等级', a.grade, ''],
    ['自控率', a.self_control_rate, '%'],
    ['平稳率', a.stability_rate, '%'],
    ['准确率', a.accuracy_rate, '%'],
    ['快速率', a.fast_rate, '%'],
    ['有效自控率', a.effective_auto_rate, '%'],
  ];

  const diagnosisItems = [
    ['振荡率', a.oscillation_index != null ? `${(a.oscillation_index * 100).toFixed(1)}%` : '—'],
    ['粘滞系数', d.stiction_confidence?.toFixed(3) || '—'],
    ['饱和率', a.valve_saturation_rate != null ? `${(a.valve_saturation_rate * 100).toFixed(1)}%` : '—'],
    ['调节时间', d.settling_time != null ? `${d.settling_time.toFixed(1)}s` : '—'],
    ['OP行程指数', d.travel_index?.toFixed(3) || '—'],
    ['优良值率', d.good_rate != null ? `${d.good_rate.toFixed(1)}%` : '—'],
    ['投运率', a.effective_auto_rate != null ? `${a.effective_auto_rate.toFixed(1)}%` : '—'],
    ['操作频次', a.operation_frequency != null ? `${a.operation_frequency.toFixed(2)}次/h` : '—'],
  ];

  const suggestionSections = useMemo(() => {
    if (!sugg?.suggestion) return [];
    return [
      sugg.suggestion.diagnosis ? { title: '诊断说明', body: sugg.suggestion.diagnosis } : null,
      sugg.suggestion.causes?.length ? { title: '可能原因', list: sugg.suggestion.causes } : null,
      sugg.suggestion.suggestions?.length ? { title: '优化建议', list: sugg.suggestion.suggestions } : null,
    ].filter(Boolean);
  }, [sugg]);

  if (loading) return <StateBlock type="loading" title="评估详情加载中" detail="正在汇总当前回路的评估指标、雷达图与诊断建议。" />;
  if (!data) return <StateBlock type="error" title="评估详情加载失败" detail={detailError || '当前无法读取该回路的评估结果。'} action={<BackAction onClick={() => nav(returnTo)}>{returnLabel}</BackAction>} />;

  const loopInfo = data.loop_info || {};

  const renderSuggestionSection = (section) => {
    if (section.body) {
      return <div className="ui-text-block"><p>{section.body}</p></div>;
    }
    if (section.list) {
      return (
        <ul style={{ paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {section.list.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    }
    return null;
  };

  const suggestionTone = (sugg?.fault_confidence || 0) >= 0.7 ? 'ok' : 'warn';

  const infoSubtitle = `${loopInfo.unit || '未分配装置'} · ${loopInfo.description || loopInfo.loop_type || '单回路评估详情'}`;

  const gradeColor = GRADE_COLORS[a.grade] || 'var(--text-primary)';

  const faultGrid = (
    <div className="ui-shell-grid ui-shell-grid--two">
      <FaultChip label="阀门粘滞" detected={d.stiction_detected} conf={d.stiction_confidence} />
      <FaultChip label="回路振荡" detected={d.oscillation_detected} conf={d.oscillation_confidence} period={d.oscillation_period} />
      <FaultChip label="非线性" detected={d.nonlinearity_detected} conf={d.nonlinearity_degree} />
      <FaultChip label="回路耦合" detected={d.coupling_candidates?.length > 0} conf={d.coupling_strength} tags={d.coupling_candidates} />
    </div>
  );

  const performanceGrid = (
    <div className="ui-key-value">
      {performanceItems.map(([label, val, unit]) => (
        <div key={label}>{label}: <strong style={label === '性能等级' ? { color: gradeColor } : undefined}>{typeof val === 'number' ? val.toFixed(1) : val}{unit}</strong></div>
      ))}
    </div>
  );

  const diagnosisGrid = (
    <div className="ui-card-grid">
      {diagnosisItems.map(([label, val]) => (
        <MetricCard key={label} label={label} value={val} detail="当前评估窗口" />
      ))}
    </div>
  );

  const suggestionPanel = sugg ? (
    <div className="ui-stack">
      <StatusBanner tone={suggestionTone} items={[{ label: '诊断结果', value: sugg.suggestion?.title || '运行正常' }, { label: '置信度', value: `${((sugg.fault_confidence || 0) * 100).toFixed(0)}%` }]} detail={sugg.suggestion?.diagnosis || '当前未返回额外诊断说明。'} />
      {suggestionSections.map((section) => (
        <Panel key={section.title} title={section.title}>
          {renderSuggestionSection(section)}
        </Panel>
      ))}
    </div>
  ) : <StateBlock compact type="warn" title="诊断建议暂不可用" detail={suggestionError || '当前无法读取优化建议。'} />;

  const radarPanel = radar ? <RadarChart tagName={tagName} dimensions={radar.dimensions} /> : <StateBlock compact type="warn" title="雷达图暂不可用" detail={radarError || '当前无法读取雷达图数据。'} />;

  const primaryCards = (
    <div className="ui-card-grid">
      <MetricCard label="PV (过程值)" value={pv != null ? pv.toFixed(2) : '—'} detail="当前过程值" tone="success" />
      <MetricCard label="SP (设定值)" value={sp != null ? sp.toFixed(2) : '—'} detail="当前目标值" tone="default" />
      <MetricCard label="OP (输出值)" value={op != null ? `${op.toFixed(2)}%` : '—'} detail="当前控制输出" tone="warn" />
      <MetricCard label="当前评级" value={a.grade || '—'} detail="用于决定处理优先级" />
    </div>
  );

  const maybeDegraded = degradedItems.length > 0 ? <StatusBanner tone="warn" items={[{ label: '局部降级', value: `${degradedItems.length} 个模块` }]} detail={degradedItems.join('；')} /> : null;

  const tuningAction = <PrimaryAction onClick={() => nav(`/loop/${tagName}/tuning`, { state: { sourceTitle: '评估详情', returnLabel: '返回评估详情', returnTo: `/assessment/${tagName}` } })}>进入 PID 整定</PrimaryAction>;

  const backAction = <BackAction onClick={() => nav(returnTo)}>{returnLabel}</BackAction>;

  const faultSubtitle = '确认主问题类型及其证据强度。';
  const diagnosisSubtitle = '把振荡、粘滞、饱和与操作频次放在同一组证据里判读。';
  const performanceSubtitle = '先看评分、等级和投运质量，再决定是否进入整定。';
  const radarSubtitle = '从多个评估维度确认当前回路的综合表现。';
  const suggestSubtitle = '从结论直接衔接到后续动作。';

  const infoBanner = <StatusBanner tone="neutral" items={[{ label: '评估对象', value: loopInfo.tag_name || tagName }, { label: '装置', value: loopInfo.unit || '—' }, { label: '数据来源', value: '评估详情' }]} detail="先确认评估结论，再进入回路详情或整定动作。" />;

  const title = `${tagName} · 评估详情`;
  const pageBody = (
    <PageSection columns="sidebar">
      <div className="ui-stack">
        <div className="ui-shell-grid ui-shell-grid--two">
          <Panel title="多维度综合分析（雷达图）" subtitle={radarSubtitle}>{radarPanel}</Panel>
          <Panel title="性能指标" subtitle={performanceSubtitle}>{performanceGrid}</Panel>
        </div>
        <Panel title="故障诊断指标" subtitle={diagnosisSubtitle}>{diagnosisGrid}</Panel>
        <Panel title="故障检测详情" subtitle={faultSubtitle}>{faultGrid}</Panel>
      </div>
      <div className="ui-stack">
        <Panel title="智能诊断与优化建议" subtitle={suggestSubtitle}>{suggestionPanel}</Panel>
      </div>
    </PageSection>
  );

  const actions = <>{backAction}{tuningAction}</>;

  const headerBody = <div className="ui-stack">{primaryCards}{maybeDegraded}{infoBanner}</div>;

  const headerSubtitle = infoSubtitle;

  const page = (
    <div className="ui-stack">
      <Panel title={title} subtitle={headerSubtitle} actions={actions}>{headerBody}</Panel>
      {pageBody}
    </div>
  );

  return page;
}

function FaultChip({ label, detected, conf, period, tags }) {
  const color = detected ? 'var(--red)' : 'var(--green)';
  const status = detected ? '检测到' : '未检测到';
  let detail = '';
  if (period) detail = `周期 ${period.toFixed(1)}s`;
  if (tags?.length) detail = `关联: ${tags.slice(0, 3).join(', ')}`;
  return (
    <div className="ui-callout" style={{ borderColor: color }}>
      <div style={{ fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{status}{conf != null ? ` (${(conf * 100).toFixed(0)}%)` : ''}</div>
      {detail ? <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{detail}</div> : null}
    </div>
  );
}

