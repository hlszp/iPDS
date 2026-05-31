import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { FilterBar, FilterGroup, MetricCard, Panel, PrimaryAction, StateBlock, StatusBanner } from '../../components/ui';

function getFilenameFromDisposition(header) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || null;
}

async function openReport(res, fallbackName) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const filename = getFilenameFromDisposition(res.headers.get('content-disposition')) || fallbackName;
  const reportFormat = res.headers.get('x-report-format') || (res.headers.get('content-type')?.includes('html') ? 'html' : 'pdf');

  if (reportFormat === 'html') {
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { mode: 'preview', filename, reportFormat };
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return { mode: 'download', filename, reportFormat };
}

export default function Reports() {
  const [tab, setTab] = useState('single');
  const [loops, setLoops] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [unit, setUnit] = useState('全厂');
  const [period, setPeriod] = useState('日报');
  const [status, setStatus] = useState(null);
  const [loadingLoops, setLoadingLoops] = useState(true);
  const [loopsError, setLoopsError] = useState('');

  useEffect(() => {
    setLoadingLoops(true);
    setLoopsError('');
    api.listLoops({ limit: 500 })
      .then((items) => setLoops(items || []))
      .catch((e) => {
        setLoops([]);
        setLoopsError(e.message || '报告候选回路加载失败');
      })
      .finally(() => setLoadingLoops(false));
  }, []);

  const units = useMemo(() => ['全厂', ...new Set(loops.map((item) => item.unit).filter(Boolean))], [loops]);

  const generateSingle = async () => {
    if (!selectedTag) return;
    setStatus({ type: 'loading', title: '正在生成单回路报告', detail: '系统正在拉取评估结果并输出正式报表。' });
    try {
      const res = await api.generateLoopReport(selectedTag);
      const result = await openReport(res, `${selectedTag}_评估报告.html`);
      setStatus({
        type: 'ok',
        title: result.mode === 'preview' ? '已打开报告预览' : '已下载报告文件',
        detail: `${result.filename} · ${result.reportFormat === 'html' ? 'HTML 预览' : 'PDF 下载'}`,
      });
    } catch (error) {
      setStatus({ type: 'err', title: '单回路报告生成失败', detail: error.message || '报告生成失败' });
    }
  };

  const generateBatch = async () => {
    setStatus({ type: 'loading', title: '正在生成批量报告', detail: '系统正在汇总选定范围内的回路评估结果。' });
    try {
      const res = await api.generateBatchReport(unit, period);
      const result = await openReport(res, `${unit}_${period}.html`);
      setStatus({
        type: 'ok',
        title: result.mode === 'preview' ? '已打开批量报告预览' : '已下载批量报告文件',
        detail: `${result.filename} · ${result.reportFormat === 'html' ? 'HTML 预览' : 'PDF 下载'}`,
      });
    } catch (error) {
      setStatus({ type: 'err', title: '批量报告生成失败', detail: error.message || '报告生成失败' });
    }
  };

  const statusTone = status?.type === 'err' ? 'danger' : status?.type === 'ok' ? 'ok' : status?.type === 'loading' ? 'warn' : 'neutral';

  return (
    <div className="ui-stack">
      <div className="ui-summary-grid">
        <MetricCard label="可选回路" value={loops.length} detail="单回路报告候选数量" />
        <MetricCard label="装置范围" value={Math.max(units.length - 1, 0)} detail="支持批量报告的装置数" />
        <MetricCard label="输出形态" value="PDF / HTML" detail="WeasyPrint 可用时输出 PDF，否则回退为 HTML 预览" />
        <MetricCard label="当前模式" value={tab === 'single' ? '单回路' : '批量'} detail="正式产品交付入口" />
      </div>

      <FilterBar align="left">
        <FilterGroup>
          <button type="button" className={`ui-tab ${tab === 'single' ? 'is-active' : ''}`} onClick={() => setTab('single')}>单回路报告</button>
          <button type="button" className={`ui-tab ${tab === 'batch' ? 'is-active' : ''}`} onClick={() => setTab('batch')}>批量报告</button>
        </FilterGroup>
      </FilterBar>

      <div className="ui-page-section ui-page-section--sidebar">
        <div className="ui-stack">
          <Panel title={tab === 'single' ? '单回路正式报告' : '批量正式报告'} subtitle="保留真实输出语义，不伪造任务进度或报表产物列表。">
            {loopsError ? (
              <StateBlock compact type="error" title="报告候选回路加载失败" detail={loopsError} />
            ) : loadingLoops ? (
              <StateBlock compact type="loading" title="正在加载候选回路" detail="正在同步用于报告生成的回路清单。" />
            ) : (
              <div className="ui-stack">
                {tab === 'single' ? (
                  <>
                    <Field label="选择回路" hint="进入单回路评估报告生成流程。">
                      <select className="ui-select" value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                        <option value="">— 请选择 —</option>
                        {loops.map((loop) => <option key={loop.tag_name} value={loop.tag_name}>{loop.tag_name} · {loop.unit}</option>)}
                      </select>
                    </Field>
                    <PrimaryAction onClick={generateSingle} disabled={!selectedTag}>生成单回路报告</PrimaryAction>
                  </>
                ) : (
                  <>
                    <Field label="装置范围" hint="全厂或单装置批量评估报告。">
                      <select className="ui-select" value={unit} onChange={(event) => setUnit(event.target.value)}>
                        {units.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </Field>
                    <Field label="报告周期" hint="用于周报、月报等管理视角导出。">
                      <select className="ui-select" value={period} onChange={(event) => setPeriod(event.target.value)}>
                        {['日报', '周报', '月报'].map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </Field>
                    <PrimaryAction onClick={generateBatch}>生成批量报告</PrimaryAction>
                  </>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="ui-stack">
          <Panel title="输出语义" subtitle="向客户说明当前交付形态与回退规则。">
            <div className="ui-text-block">
              <p>服务端优先生成 PDF；若本地未安装 WeasyPrint 依赖，则自动回退为 HTML 预览。</p>
              <p>当前页面仅展示真实生成结果，不展示伪作业队列、不伪造历史产物。</p>
            </div>
          </Panel>

          <Panel title="当前状态" subtitle="明确显示成功、失败与输出方式。">
            {status ? (
              <StatusBanner tone={statusTone} items={[{ label: '状态', value: status.title }]} detail={status.detail} />
            ) : (
              <StateBlock compact type="empty" title="尚未触发报告生成" detail="选择回路或装置范围后生成正式报告。" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="ui-stack" style={{ gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{hint}</div>
      {children}
    </div>
  );
}
