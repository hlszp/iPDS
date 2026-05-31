import { useEffect, useRef } from 'react';
import { echarts } from '../../lib/echarts-gauge';

export default function AutoControlGauge({ value = 0, autoLoops = 0, manualLoops = 0 }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }
    const pct = Math.round(value);
    instanceRef.current.setOption({
      series: [{
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0, max: 100,
        splitNumber: 10,
        axisLine: {
          show: true,
          lineStyle: {
            width: 18,
            color: [[0.3, '#e74c3c'], [0.7, '#f1c40f'], [1, '#2ecc71']],
          },
        },
        pointer: { length: '60%', width: 6, itemStyle: { color: 'var(--accent)' } },
        axisTick: { distance: -18, length: 8, lineStyle: { width: 1, color: 'var(--text-dim)' } },
        splitLine: { distance: -22, length: 14, lineStyle: { width: 2, color: 'var(--text-dim)' } },
        axisLabel: { color: 'var(--text-dim)', fontSize: 10, distance: 30 },
        anchor: { show: true, size: 14, itemStyle: { borderWidth: 2, borderColor: 'var(--accent)' } },
        title: { offsetCenter: [0, '70%'], color: 'var(--text-dim)', fontSize: 13 },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          fontWeight: 'bold',
          offsetCenter: [0, '45%'],
          formatter: '{value}%',
          color: '#fff',
        },
        data: [{ value: pct, name: '自控率' }],
      }],
    });
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div ref={chartRef} style={{ width: 200, height: 180 }} />
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>自动回路</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{autoLoops}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>手动回路</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--red)' }}>{manualLoops}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>总回路数</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{autoLoops + manualLoops}</div>
        </div>
      </div>
    </div>
  );
}
