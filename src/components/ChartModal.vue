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
  <q-dialog v-model="dialogOpen" maximized transition-show="slide-up" transition-hide="slide-down">
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

            <!-- 막대 (전체금액) -->
            <g>
              <rect
                v-for="(bar, i) in bars"
                :key="'bar-' + i"
                :x="bar.x"
                :y="bar.y"
                :width="bar.w"
                :height="bar.h"
                rx="3"
                class="chart__bar"
              />
            </g>

            <!-- 막대 데이터 레이블 (전체금액) -->
            <g>
              <text
                v-for="(bar, i) in bars"
                :key="'bar-label-' + i"
                :x="bar.cx"
                :y="bar.y - 5"
                class="chart__data-label chart__data-label--bar"
              >{{ formatLabel(bar.totalAmount) }}</text>
            </g>

            <!-- 꺾은선 (체크금액) -->
            <polyline
              :points="linePolyline"
              class="chart__line"
              fill="none"
            />

            <!-- 꺾은선 위 점 -->
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

            <!-- 꺾은선 데이터 레이블 (체크금액) -->
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
        <q-separator />
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
                <td class="chart-modal__table-total">{{ formatAmt(row.totalAmount) }}원</td>
                <td class="chart-modal__table-checked">{{ formatAmt(row.checkedAmount) }}원</td>
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

const dialogOpen = ref(false);

// ─────────────────────────────────────────────
// 하드코딩 월별 데이터 (개발자가 실제 API 데이터로 교체 예정)
// 현재 기준일: 2026-03-08 / 최대 1년 (2025-04 ~ 2026-03)
// ─────────────────────────────────────────────
const chartData = [
  { month: '2025-04', totalAmount:  89000, checkedAmount:  45000 },
  { month: '2025-05', totalAmount: 142000, checkedAmount:  98000 },
  { month: '2025-06', totalAmount:  67000, checkedAmount:  32000 },
  { month: '2025-07', totalAmount: 215000, checkedAmount: 178000 },
  { month: '2025-08', totalAmount:  98000, checkedAmount:  54000 },
  { month: '2025-09', totalAmount: 312000, checkedAmount: 245000 },
  { month: '2025-10', totalAmount: 189000, checkedAmount: 123000 },
  { month: '2025-11', totalAmount: 423000, checkedAmount: 367000 },
  { month: '2025-12', totalAmount: 287000, checkedAmount: 198000 },
  { month: '2026-01', totalAmount: 156000, checkedAmount:  89000 },
  { month: '2026-02', totalAmount: 234000, checkedAmount: 178000 },
  { month: '2026-03', totalAmount:  67000, checkedAmount:  45000 },
];

// ─────────────────────────────────────────────
// SVG 차트 영역 상수
// viewBox: "0 0 620 300"
// 차트 영역: x(72→600), y(24→244)
// ─────────────────────────────────────────────
const CHART = { x1: 26, x2: 654, y1: 24, y2: 304, w: 628, h: 280 };
const BAR_W = 28;

// ─────────────────────────────────────────────
// Y축 최대값 (50,000 단위 올림)
// ─────────────────────────────────────────────
const maxVal = computed(() => {
  const max = Math.max(...chartData.map((d) => d.totalAmount));
  const unit = max <= 200000 ? 50000 : 100000;
  return Math.ceil(max / unit) * unit;
});

// v → SVG Y 좌표
function toY(v: number): number {
  return CHART.y2 - (v / maxVal.value) * CHART.h;
}

// groupWidth = 528 / 12 = 44
const groupW = computed(() => CHART.w / chartData.length);

// ─────────────────────────────────────────────
// 막대 위치
// ─────────────────────────────────────────────
const bars = computed(() =>
  chartData.map((d, i) => {
    const cx = CHART.x1 + groupW.value * i + groupW.value / 2;
    const h = (d.totalAmount / maxVal.value) * CHART.h;
    return {
      x: cx - BAR_W / 2,
      y: CHART.y2 - h,
      w: BAR_W,
      h,
      cx,
      monthLabel: d.month.slice(2).replace('-', '/'), // 'YY/MM'
      totalAmount: d.totalAmount,
    };
  }),
);

// ─────────────────────────────────────────────
// 꺾은선 점 및 polyline
// ─────────────────────────────────────────────
const dots = computed(() =>
  chartData.map((d, i) => ({
    x: CHART.x1 + groupW.value * i + groupW.value / 2,
    y: toY(d.checkedAmount),
    checkedAmount: d.checkedAmount,
  })),
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
const tableRows = computed(() => [...chartData].reverse());

function formatAmt(v: number): string {
  return v.toLocaleString('ko-KR');
}

function formatLabel(v: number): string {
  return `${(v / 10000).toFixed(1)}만`;
}
</script>
