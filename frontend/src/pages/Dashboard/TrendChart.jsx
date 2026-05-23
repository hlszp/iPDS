import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function TrendChart() {
  const ref = useRef(null);
  useEffect(() => {
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 40, right: 20, bottom: 30, left: 45 },
      xAxis: { type: 'category', data: Array.from({length:30},(_,i)=>`${i+1}日`), axisLine:{lineStyle:{color:'#253545'}}, axisLabel:{color:'#708090',fontSize:10} },
      yAxis: { type: 'value', min:80, max:100, axisLine:{lineStyle:{color:'#253545'}}, axisLabel:{color:'#708090',fontSize:10}, splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}} },
      series: [
        { name:'氨合成', type:'line', smooth:true, data:[98,97.5,97,96.8,96.5,96.2,95.8,95.5,95.2,95,94.8,94.5,94.2,94,93.8,93.5,93.8,94,94.3,94.5,94.8,95,95.2,95.5,95.8,96,96.2,96.5,96.8,97], lineStyle:{color:'#3498db',width:2}, itemStyle:{color:'#3498db'}, symbol:'none' },
        { name:'甲醇装置', type:'line', smooth:true, data:[92,91.5,91,90.8,90.5,90,89.5,89,88.5,88,87.5,87.8,88,88.5,89,89.5,90,90.5,91,91.5,92,92.5,93,93.2,93.5,93.8,94,94.2,94.5,94.8], lineStyle:{color:'#f0a030',width:2}, itemStyle:{color:'#f0a030'}, symbol:'none' },
        { name:'PSA 制氢', type:'line', smooth:true, data:[85,84.5,84,83.5,83,82.5,82,81.5,81,80.5,80,80.2,81,81.5,82,82.5,83,83.5,84,84.5,85,85.2,85.5,85.8,86,86.2,86.5,86.8,87,87.2], lineStyle:{color:'#e74c3c',width:2}, itemStyle:{color:'#e74c3c'}, symbol:'none' },
      ],
      legend: { top: 5, right: 0, textStyle: { color: '#d0d8e0', fontSize: 11 } },
    });
    return () => chart.dispose();
  }, []);

  return <div ref={ref} style={{width:'100%',height:'100%',minHeight:150}} />;
}
