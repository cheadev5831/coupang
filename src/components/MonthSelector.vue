<template>
  <div class="card-base section-gap">
    <!-- 연도 + 월 버튼 통합 1행 -->
    <div class="month-selector__row">
      <!-- 연도 컨트롤 (세로 배치) -->
      <div class="month-selector__year-control">
        <q-btn
          flat
          round
          dense
          icon="expand_less"
          color="grey-7"
          size="xs"
          :disable="loading || year >= currentYear"
          @click="nextYear"
        />
        <span class="month-selector__year-label">{{ year }}년</span>
        <q-btn
          flat
          round
          dense
          icon="expand_more"
          color="grey-7"
          size="xs"
          :disable="loading"
          @click="prevYear"
        />
      </div>

      <!-- 월 버튼 6x2 그리드 -->
      <div class="month-selector__months">
        <q-btn
          v-for="m in 12"
          :key="m"
          :label="`${m}월`"
          :color="selectedMonth === m ? 'primary' : 'grey-2'"
          :text-color="selectedMonth === m ? 'white' : 'grey-7'"
          unelevated
          dense
          no-caps
          size="sm"
          :disable="loading"
          :class="[
            'month-selector__month-btn',
            selectedMonth === m ? 'month-selector__month-btn--active' : '',
            props.monthsWithData?.includes(m) ? 'month-selector__month-btn--has-data' : '',
          ]"
          @click="selectMonth(m)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import 'src/css/month-selector.css';
import type { SelectedMonth } from 'src/models/app';

const props = defineProps<{
  modelValue: SelectedMonth;
  loading?: boolean;
  monthsWithData?: number[];
  allMonthsWithData?: Map<number, number[]>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SelectedMonth];
  fetch: [];
}>();

const currentYear = new Date().getFullYear();
const year = ref(props.modelValue.year);
const selectedMonth = ref(props.modelValue.month);

watch(
  () => props.modelValue,
  (val) => {
    year.value = val.year;
    selectedMonth.value = val.month;
  },
);

function prevYear() {
  const targetYear = year.value - 1;
  const months = props.allMonthsWithData?.get(targetYear) ?? [];
  year.value = targetYear;
  selectedMonth.value = months.length > 0 ? Math.max(...months) : 12;
  emitUpdate();
  if (months.length > 0) emit('fetch');
}

function nextYear() {
  if (year.value >= currentYear) return;
  const targetYear = year.value + 1;
  const months = props.allMonthsWithData?.get(targetYear) ?? [];
  year.value = targetYear;
  selectedMonth.value = months.length > 0 ? Math.min(...months) : 1;
  emitUpdate();
  if (months.length > 0) emit('fetch');
}

function selectMonth(m: number) {
  selectedMonth.value = m;
  emitUpdate();
  emit('fetch');
}

function emitUpdate() {
  emit('update:modelValue', { year: year.value, month: selectedMonth.value });
}
</script>
