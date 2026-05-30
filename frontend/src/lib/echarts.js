import * as echarts from 'echarts/core';
import { LineChart, GaugeChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  GaugeChart,
  RadarChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };
