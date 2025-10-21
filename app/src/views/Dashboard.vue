<template>
  <div>
    <h2>展示端 - 指标切换与图表占位</h2>
    <div style="margin-bottom: 12px;">
      <label>
        <input type="radio" value="permit" v-model="metric" /> 办证
      </label>
      <label style="margin-left: 12px;">
        <input type="radio" value="exception" v-model="metric" /> 异常
      </label>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
      <div ref="pieRef" style="height: 300px; border: 1px dashed #ccc;"></div>
      <div ref="lineRef" style="height: 300px; border: 1px dashed #ccc;"></div>
      <div ref="barRef" style="height: 300px; border: 1px dashed #ccc;"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

const metric = ref<'permit' | 'exception'>('permit');
const pieRef = ref<HTMLDivElement | null>(null);
const lineRef = ref<HTMLDivElement | null>(null);
const barRef = ref<HTMLDivElement | null>(null);

function render() {
  const pie = echarts.init(pieRef.value!);
  pie.setOption({
    title: { text: '饼图' },
    series: [{ type: 'pie', data: [
      { value: 40, name: 'A' }, { value: 20, name: 'B' }, { value: 30, name: 'C' }
    ] }],
  });

  const line = echarts.init(lineRef.value!);
  line.setOption({
    title: { text: '折线图' },
    xAxis: { type: 'category', data: ['一', '二', '三', '四', '五'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [1, 3, 2, 5, 4] }],
  });

  const bar = echarts.init(barRef.value!);
  bar.setOption({
    title: { text: '柱状图' },
    xAxis: { type: 'category', data: ['一', '二', '三', '四', '五'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [5, 2, 4, 1, 3] }],
  });
}

onMounted(() => {
  render();
});

watch(metric, () => {
  // 在后续任务中根据 metric 调整数据
});
</script>
