import { useEffect, useRef } from 'react';
import { echarts } from '../../lib/echarts-radar';

export default function RadarChart({ tagName, dimensions }) {
  const ref = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);

    const indicators = dimensions.map((d) => ({ name: d.name, max: d.max }));
    const values = dimensions.map((d) => d.value);

    inst.current.setOption({
      radar: {
        indicator: indicators,
        shape: 'polygon',
        center: ['50%', '50%'],
        radius: '65%',
        splitNumber: 4,
        axisName: { color: 'var(--text-dim)', fontSize: 10, borderRadius: 3, padding: [3, 5] },
        splitArea: { areaStyle: { color: ['rgba(240,160,48,0.03)', 'rgba(240,160,48,0.06)'] } },
        axisLine: { lineStyle: { color: 'var(--border)' } },
        splitLine: { lineStyle: { color: 'var(--border)' } },
      },
      series: [{
        type: 'radar',
        data: [{ value: values, name: tagName, areaStyle: { color: 'rgba(240,160,48,0.12)' } }],
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: 'var(--accent)', width: 2 },
        itemStyle: { color: 'var(--accent)' },
      }],
    });
  }, [dimensions, tagName]);

  return <div ref={ref} style={{ width: '100%', height: 360 }} />;
}
