import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const COLORS = ['#3498db', '#f0a030', '#2ecc71', '#e74c3c', '#9b59b6'];

export default function TrendChart({ trends }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });

    if (!trends || trends.length === 0) {
      chart.setOption({
        backgroundColor: 'transparent',
        title: { text: '暂无趋势数据', left: 'center', top: 'center', textStyle: { color: '#708090', fontSize: 13 } },
      });
      return () => chart.dispose();
    }

    const dates = trends[0]?.data?.map(p => p.date.substring(8)) || [];

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 40, right: 20, bottom: 30, left: 45 },
      xAxis: {
        type: 'category', data: dates,
        axisLine: { lineStyle: { color: '#253545' } },
        axisLabel: { color: '#708090', fontSize: 10 },
      },
      yAxis: {
        type: 'value', min: 80, max: 100,
        axisLine: { lineStyle: { color: '#253545' } },
        axisLabel: { color: '#708090', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: trends.map((t, i) => ({
        name: t.unit,
        type: 'line',
        smooth: true,
        data: t.data.map(p => p.value),
        lineStyle: { color: COLORS[i % COLORS.length], width: 2 },
        itemStyle: { color: COLORS[i % COLORS.length] },
        symbol: 'none',
      })),
      legend: { top: 5, right: 0, textStyle: { color: '#d0d8e0', fontSize: 11 } },
    });
    return () => chart.dispose();
  }, [trends]);

  return <div ref={ref} style={{width:'100%',height:'100%',minHeight:150}} />;
}
