import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  RadarChart,
  RadarComponent,
  CanvasRenderer,
]);

export { echarts };
