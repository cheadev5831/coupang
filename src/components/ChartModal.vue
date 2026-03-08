<template>
  <!-- 차트 버튼 (SummaryBar 내부에 삽입) -->
  <q-btn
    class="chart-modal__open-btn"
    unelevated
    icon="bar_chart"
    label="차트"
    @click="dialogOpen = true"
  />

  <!-- 차트 모달 -->
  <q-dialog v-model="dialogOpen" maximized transition-show="slide-up" transition-hide="slide-down" @show="loadChartData">
    <q-card class="chart-modal__card">

      <!-- 헤더 -->
      <q-bar class="chart-modal__header">
        <span class="chart-modal__header-title">월별 지출 현황</span>
        <q-space />
        <q-btn dense flat round icon="close" color="white" v-close-popup />
      </q-bar>

      <div class="chart-modal__body">

        <!-- ApexCharts 혼합 차트 -->
        <div class="chart-modal__chart-wrap">
          <VueApexCharts
            type="line"
            :height="chartHeight"
            :options="chartOptions"
            :series="series"
          />
        </div>

        <!-- 데이터 테이블 -->
        <q-separator class="chart-modal__separator" />
        <div class="chart-modal__table-wrap">
          <table class="chart-modal__table">
            <thead>
              <tr>
                <th>월</th>
                <th>전체금액</th>
                <th>체크금액</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="row.month">
                <td>{{ row.month }}</td>
                <td class="chart-modal__table-total">{{ row.hasData ? formatAmt(row.totalAmount) + '원' : '-' }}</td>
                <td class="chart-modal__table-checked">{{ row.hasData ? formatAmt(row.checkedAmount) + '원' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import 'src/css/chart-modal.css';
import { useChartData } from 'src/composables/useChartData';

const dialogOpen = ref(false);
const { chartData, loadChartData } = useChartData();

// ─────────────────────────────────────────────
// 화면 높이 기반 차트 높이 (모바일 가로 모드 대응)
// ─────────────────────────────────────────────
const chartHeight = computed(() => {
  if (typeof window === 'undefined') return 260;
  return window.innerHeight < 500 ? 180 : 260;
});

// ─────────────────────────────────────────────
// ApexCharts 시리즈
// ─────────────────────────────────────────────
const series = computed(() => [
  {
    name: '전체금액',
    type: 'bar',
    data: chartData.value.map((d) => (d.hasData ? d.totalAmount : null)),
  },
  {
    name: '체크금액',
    type: 'line',
    data: chartData.value.map((d) => (d.hasData ? d.checkedAmount : null)),
  },
]);

// ─────────────────────────────────────────────
// ApexCharts 옵션
// ─────────────────────────────────────────────
const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'line' as const,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Pretendard, Apple SD Gothic Neo, sans-serif',
    background: 'transparent',
    animations: { enabled: false },
  },
  colors: ['#5b8def', '#ff6b35'],
  stroke: {
    width: [0, 2.5],
    curve: 'smooth',
  },
  plotOptions: {
    bar: {
      columnWidth: '52%',
      borderRadius: 3,
    },
  },
  dataLabels: {
    enabled: true,
    enabledOnSeries: [0, 1],
    formatter: (val: string | number | number[]) => {
      const v = typeof val === 'number' ? val : 0;
      if (!v) return '';
      return v >= 10000 ? `${(v / 10000).toFixed(1)}만` : `${v.toLocaleString('ko-KR')}`;
    },
    style: {
      fontSize: '9px',
      fontWeight: '700',
      colors: ['#5b8def', '#ff6b35'],
    },
    background: { enabled: false },
    offsetY: -7,
  },
  markers: {
    size: [0, 4],
    strokeWidth: 2,
    strokeColors: '#ffffff',
    hover: { size: 6 },
  },
  xaxis: {
    categories: chartData.value.map((d) => d.month.slice(2).replace('-', '/')),
    labels: {
      style: { fontSize: '11px', colors: '#999' },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { show: false },
  },
  grid: {
    borderColor: '#ebebeb',
    strokeDashArray: 0,
    padding: { top: 8, right: 10, bottom: 0, left: 0 },
  },
  tooltip: {
    shared: true,
    intersect: false,
    style: { fontSize: '13px' },
    y: {
      formatter: (val: number | null) =>
        val != null ? `${val.toLocaleString('ko-KR')}원` : '-',
    },
  },
  legend: { show: false },
}));

// ─────────────────────────────────────────────
// 테이블 (최신 월 우선)
// ─────────────────────────────────────────────
const tableRows = computed(() => [...chartData.value].reverse());

function formatAmt(v: number): string {
  return v.toLocaleString('ko-KR');
}
</script>
