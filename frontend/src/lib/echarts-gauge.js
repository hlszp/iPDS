import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  GaugeChart,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };
