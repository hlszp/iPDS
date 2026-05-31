import './styles.css';

export function PageSection({ children, columns = 'default', className = '' }) {
  const modeClass = columns === 'sidebar'
    ? 'ui-page-section ui-page-section--sidebar'
    : columns === 'tight'
      ? 'ui-page-section ui-page-section--tight'
      : 'ui-page-section';
  return <section className={`${modeClass} ${className}`.trim()}>{children}</section>;
}

export function Panel({ title, subtitle, actions, children, padded = true, className = '' }) {
  return (
    <div className={`ui-panel ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="ui-panel__header">
          <div>
            {title ? <div className="ui-panel__title">{title}</div> : null}
            {subtitle ? <div className="ui-panel__subtitle">{subtitle}</div> : null}
          </div>
          {actions ? <div className="ui-panel__actions">{actions}</div> : null}
        </div>
      )}
      <div className={padded ? 'ui-panel__body' : ''}>{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, detail, tone = 'default' }) {
  return (
    <div className={`ui-metric-card ui-metric-card--${tone}`}>
      <div className="ui-metric-card__label">{label}</div>
      <div className="ui-metric-card__value">{value}</div>
      {detail ? <div className="ui-metric-card__detail">{detail}</div> : null}
    </div>
  );
}

export function StatusBanner({ tone = 'neutral', items = [], detail, actions, compact = false }) {
  return (
    <div className={`ui-status-banner ui-status-banner--${tone} ${compact ? 'ui-status-banner--compact' : ''}`.trim()}>
      <div className="ui-status-banner__items">
        {items.map((item) => (
          <div key={item.label} className="ui-status-banner__item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      {detail ? <div className="ui-status-banner__detail">{detail}</div> : null}
      {actions ? <div className="ui-status-banner__actions">{actions}</div> : null}
    </div>
  );
}

export function StateBlock({ type = 'empty', title, detail, action, compact = false }) {
  return (
    <div className={`ui-state ui-state--${type} ${compact ? 'ui-state--compact' : ''}`.trim()}>
      <div className="ui-state__title">{title}</div>
      {detail ? <div className="ui-state__detail">{detail}</div> : null}
      {action ? <div className="ui-state__action">{action}</div> : null}
    </div>
  );
}

export function RetryAction({ children = '重试', onClick }) {
  return <button type="button" className="ui-secondary-action" onClick={onClick}>{children}</button>;
}

export function FilterBar({ children, align = 'between' }) {
  return <div className={`ui-filter-bar ui-filter-bar--${align}`}>{children}</div>;
}

export function FilterGroup({ children }) {
  return <div className="ui-filter-group">{children}</div>;
}

export function GradePill({ grade, active = false, count, onClick }) {
  return (
    <button type="button" className={`ui-grade-pill ui-grade-pill--${grade || '开环'} ${active ? 'is-active' : ''}`.trim()} onClick={onClick}>
      <span className="ui-grade-pill__name">{grade}</span>
      <span className="ui-grade-pill__count">{count}</span>
    </button>
  );
}

export function LoopListItem({ title, meta, value, tone = 'default', onClick, secondary = false }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`ui-loop-item ${secondary ? 'ui-loop-item--secondary' : ''}`} onClick={onClick}>
      <div>
        <div className="ui-loop-item__title">{title}</div>
        {meta ? <div className="ui-loop-item__meta">{meta}</div> : null}
      </div>
      <div className={`ui-loop-item__value ui-loop-item__value--${tone}`}>{value}</div>
    </Tag>
  );
}

export function ChartPanel({ title, subtitle, actions, state, children, minHeight = 260 }) {
  return (
    <Panel title={title} subtitle={subtitle} actions={actions} padded={false} className="ui-chart-panel">
      <div className="ui-chart-panel__body" style={{ minHeight }}>
        {state || children}
      </div>
    </Panel>
  );
}

export function WorkbenchRail({ title, subtitle, children, actions }) {
  return (
    <Panel title={title} subtitle={subtitle} actions={actions} className="ui-workbench-rail">
      <div className="ui-stack">{children}</div>
    </Panel>
  );
}

export function DataHero({ title, subtitle, aside, children }) {
  return (
    <section className="ui-data-hero">
      <div className="ui-data-hero__main">
        <div className="ui-data-hero__title">{title}</div>
        {subtitle ? <div className="ui-data-hero__subtitle">{subtitle}</div> : null}
        <div className="ui-data-hero__metrics">{children}</div>
      </div>
      {aside ? <div className="ui-data-hero__aside">{aside}</div> : null}
    </section>
  );
}

export function SectionCaption({ kicker, title, detail, actions }) {
  return (
    <div className="ui-section-caption">
      <div>
        {kicker ? <div className="ui-section-caption__kicker">{kicker}</div> : null}
        <div className="ui-section-caption__title">{title}</div>
        {detail ? <div className="ui-section-caption__detail">{detail}</div> : null}
      </div>
      {actions ? <div className="ui-section-caption__actions">{actions}</div> : null}
    </div>
  );
}

export function BackAction({ children, onClick }) {
  return <button type="button" className="ui-back-action" onClick={onClick}>{children}</button>;
}

export function PrimaryAction({ children, onClick, disabled = false }) {
  return <button type="button" className="ui-primary-action" onClick={onClick} disabled={disabled}>{children}</button>;
}
