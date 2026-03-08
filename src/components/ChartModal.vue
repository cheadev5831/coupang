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

        <!-- 범례 -->
        <div class="chart-modal__legend">
          <div class="chart-modal__legend-item">
            <span class="chart-modal__legend-swatch chart-modal__legend-swatch--bar"></span>
            <span class="chart-modal__legend-text">전체금액</span>
          </div>
          <div class="chart-modal__legend-item">
            <svg class="chart-modal__legend-line-svg" viewBox="0 0 28 10" width="28" height="10">
              <line x1="0" y1="5" x2="28" y2="5" stroke="#ff6b35" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="14" cy="5" r="3.5" fill="#ff6b35" stroke="white" stroke-width="1.5" />
            </svg>
            <span class="chart-modal__legend-text">체크금액</span>
          </div>
        </div>

        <!-- SVG 혼합 차트 -->
        <div class="chart-modal__chart-wrap">
          <svg viewBox="0 0 662 360" class="chart-modal__svg">

            <!-- 그리드 수평선 -->
            <g>
              <line
                v-for="tick in yTicks"
                :key="'grid-' + tick.label"
                :x1="CHART.x1"
                :y1="tick.y"
                :x2="CHART.x2"
                :y2="tick.y"
                class="chart__grid-line"
              />
            </g>

            <!-- Y축 레이블 -->
            <g>
              <text
                v-for="tick in yTicks"
                :key="'ylabel-' + tick.label"
                :x="CHART.x1 - 6"
                :y="tick.y + 4"
                class="chart__label chart__label--y"
              >{{ tick.label }}</text>
            </g>

            <!-- 막대 (전체금액, 데이터 있는 달만) -->
            <g>
              <rect
                v-for="(bar, i) in bars"
                v-show="bar.hasData"
                :key="'bar-' + i"
                :x="bar.x"
                :y="bar.y"
                :width="bar.w"
                :height="bar.h"
                rx="3"
                class="chart__bar"
              />
            </g>

            <!-- 막대 데이터 레이블 (전체금액, 데이터 있는 달만) -->
            <g>
              <text
                v-for="(bar, i) in bars"
                v-show="bar.hasData"
                :key="'bar-label-' + i"
                :x="bar.cx"
                :y="bar.y - 5"
                class="chart__data-label chart__data-label--bar"
              >{{ formatLabel(bar.totalAmount) }}</text>
            </g>

            <!-- 꺾은선 (체크금액, 데이터 있는 달 연결) -->
            <polyline
              v-if="linePolyline"
              :points="linePolyline"
              class="chart__line"
              fill="none"
            />

            <!-- 꺾은선 위 점 (데이터 있는 달만) -->
            <g>
              <circle
                v-for="(dot, i) in dots"
                :key="'dot-' + i"
                :cx="dot.x"
                :cy="dot.y"
                r="4"
                class="chart__dot"
              />
            </g>

            <!-- 꺾은선 데이터 레이블 (체크금액, 데이터 있는 달만) -->
            <g>
              <text
                v-for="(dot, i) in dots"
                :key="'dot-label-' + i"
                :x="dot.x"
                :y="dot.y - 10"
                class="chart__data-label chart__data-label--line"
              >{{ formatLabel(dot.checkedAmount) }}</text>
            </g>

            <!-- X축 레이블 -->
            <g>
              <text
                v-for="(bar, i) in bars"
                :key="'xlabel-' + i"
                :x="bar.cx"
                :y="CHART.y2 + 18"
                class="chart__label chart__label--x"
              >{{ bar.monthLabel }}</text>
            </g>

          </svg>
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
import 'src/css/chart-modal.css';
import { useChartData } from 'src/composables/useChartData';

const dialogOpen = ref(false);

// ─────────────────────────────────────────────
// Firestore 기반 12개월 차트 데이터
// ─────────────────────────────────────────────
const { chartData, loadChartData } = useChartData();

// ─────────────────────────────────────────────
// SVG 차트 영역 상수
// ─────────────────────────────────────────────
const CHART = { x1: 26, x2: 654, y1: 24, y2: 304, w: 628, h: 280 };
const BAR_W = 28;
const GROUP_W = CHART.w / 12; // 12개월 고정

// ─────────────────────────────────────────────
// Y축 최대값 (데이터 없으면 기본 100,000)
// ─────────────────────────────────────────────
const maxVal = computed(() => {
  const max = Math.max(...chartData.value.map((d) => d.totalAmount), 0);
  if (max === 0) return 100000;
  const unit = max <= 200000 ? 50000 : 100000;
  return Math.ceil(max / unit) * unit;
});

function toY(v: number): number {
  return CHART.y2 - (v / maxVal.value) * CHART.h;
}

// ─────────────────────────────────────────────
// 막대 위치 (12개월 고정 레이아웃)
// ─────────────────────────────────────────────
const bars = computed(() =>
  chartData.value.map((d, i) => {
    const cx = CHART.x1 + GROUP_W * i + GROUP_W / 2;
    const h = d.hasData ? (d.totalAmount / maxVal.value) * CHART.h : 0;
    return {
      x: cx - BAR_W / 2,
      y: CHART.y2 - h,
      w: BAR_W,
      h,
      cx,
      monthLabel: d.month.slice(2).replace('-', '/'), // 'YY/MM'
      totalAmount: d.totalAmount,
      hasData: d.hasData,
    };
  }),
);

// ─────────────────────────────────────────────
// 꺾은선 점 및 polyline (데이터 있는 달만)
// ─────────────────────────────────────────────
const dots = computed(() =>
  chartData.value
    .map((d, i) => ({
      x: CHART.x1 + GROUP_W * i + GROUP_W / 2,
      y: toY(d.checkedAmount),
      checkedAmount: d.checkedAmount,
      hasData: d.hasData,
    }))
    .filter((d) => d.hasData),
);

const linePolyline = computed(() =>
  dots.value.map((p) => `${p.x},${p.y}`).join(' '),
);

// ─────────────────────────────────────────────
// Y축 눈금 (6개: 0 ~ maxVal)
// ─────────────────────────────────────────────
const yTicks = computed(() =>
  Array.from({ length: 6 }, (_, i) => {
    const v = (maxVal.value / 5) * i;
    return {
      y: toY(v),
      label: v === 0 ? '0' : `${Math.round(v / 10000)}만`,
    };
  }),
);

// ─────────────────────────────────────────────
// 테이블 (최신 월 우선)
// ─────────────────────────────────────────────
const tableRows = computed(() => [...chartData.value].reverse());

function formatAmt(v: number): string {
  return v.toLocaleString('ko-KR');
}

function formatLabel(v: number): string {
  return `${(v / 10000).toFixed(1)}만`;
}
</script>
